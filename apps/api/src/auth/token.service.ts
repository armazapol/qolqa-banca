import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import type { RequestMeta } from '../common/request-context';
import { randomToken, sha256 } from '../common/security/tokens';
import type { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACCESS_AUDIENCE,
  ACCESS_TOKEN_TTL_S,
  JWT_ISSUER,
  REFRESH_TOKEN_TTL_MS,
} from './auth.constants';

export interface AccessTokenPayload {
  sub: string;
  name: string;
}

export interface RotatedSession {
  userId: string;
  refreshToken: string;
}

/**
 * Access token: JWT de 5 min, solo en memoria del cliente.
 * Refresh token: valor opaco en cookie httpOnly, rotado en cada uso y con
 * detección de reutilización por familia (ADR-0009).
 */
@Injectable()
export class TokenService {
  private readonly accessSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    config: ConfigService<Env, true>,
  ) {
    this.accessSecret = config.get('JWT_ACCESS_SECRET', { infer: true });
  }

  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: ACCESS_TOKEN_TTL_S,
      issuer: JWT_ISSUER,
      audience: ACCESS_AUDIENCE,
      algorithm: 'HS256',
    });
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwt.verifyAsync<AccessTokenPayload>(token, {
      secret: this.accessSecret,
      issuer: JWT_ISSUER,
      audience: ACCESS_AUDIENCE,
      algorithms: ['HS256'],
    });
  }

  /** Abre una sesión nueva (nueva familia de refresh tokens). */
  createSession(userId: string, meta: RequestMeta): Promise<string> {
    return this.storeRefreshToken(userId, randomUUID(), meta);
  }

  async rotate(
    rawToken: string | undefined,
    meta: RequestMeta,
  ): Promise<RotatedSession> {
    if (!rawToken) throw new UnauthorizedException('Sesión no encontrada');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
    });
    if (!stored) throw new UnauthorizedException('Sesión no válida');

    // Un token ya usado o revocado indica robo: se invalida toda la sesión.
    if (stored.usedAt || stored.revokedAt) {
      await this.revokeFamily(stored.familyId);
      await this.audit.record({
        action: 'TOKEN_REUSE_DETECTED',
        outcome: 'FAILURE',
        userId: stored.userId,
        meta,
        metadata: { familyId: stored.familyId },
      });
      throw new UnauthorizedException('Sesión revocada por seguridad');
    }
    if (stored.expiresAt < new Date())
      throw new UnauthorizedException('Sesión expirada');

    // Marcado condicional: si dos peticiones llegan a la vez, solo una gana.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count === 0) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Sesión revocada por seguridad');
    }

    const refreshToken = await this.storeRefreshToken(
      stored.userId,
      stored.familyId,
      meta,
    );
    return { userId: stored.userId, refreshToken };
  }

  async revoke(rawToken: string | undefined): Promise<string | null> {
    if (!rawToken) return null;
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
    });
    if (!stored) return null;
    await this.revokeFamily(stored.familyId);
    return stored.userId;
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async storeRefreshToken(
    userId: string,
    familyId: string,
    meta: RequestMeta,
  ): Promise<string> {
    const raw = randomToken();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    return raw;
  }
}
