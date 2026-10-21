import {
  ForbiddenException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type {
  AccessTokenResponse,
  LoginChallengeResponse,
  LoginRequest,
  VerifyOtpRequest,
} from '@qolqa/contracts';
import { AuditService } from '../audit/audit.service';
import type { RequestMeta } from '../common/request-context';
import type { Env } from '../config/env';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACCESS_TOKEN_TTL_S,
  INVALID_CREDENTIALS,
  JWT_ISSUER,
  LOCK_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  MFA_AUDIENCE,
  MFA_TOKEN_TTL_S,
} from './auth.constants';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { TotpService } from './totp.service';

export interface IssuedSession {
  response: AccessTokenResponse;
  refreshToken: string;
}

/**
 * Login en dos pasos: contraseña → reto MFA → código TOTP (autenticación
 * reforzada, ADR-0011). Los fallos de ambos pasos cuentan para el bloqueo.
 */
@Injectable()
export class AuthService {
  private readonly mfaSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly totp: TotpService,
    private readonly tokens: TokenService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    config: ConfigService<Env, true>,
  ) {
    this.mfaSecret = config.get('JWT_MFA_SECRET', { infer: true });
  }

  async login(
    dto: LoginRequest,
    meta: RequestMeta,
  ): Promise<LoginChallengeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    const passwordOk = await this.passwords.verify(
      user?.passwordHash ?? null,
      dto.password,
    );

    if (!user || this.isLocked(user) || !passwordOk) {
      if (user && !this.isLocked(user))
        await this.registerFailure(user.id, meta);
      await this.audit.record({
        action: 'LOGIN_PASSWORD',
        outcome: 'FAILURE',
        userId: user?.id,
        meta,
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    await this.audit.record({
      action: 'LOGIN_PASSWORD',
      outcome: 'SUCCESS',
      userId: user.id,
      meta,
    });
    const challengeToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: this.mfaSecret,
        expiresIn: MFA_TOKEN_TTL_S,
        issuer: JWT_ISSUER,
        audience: MFA_AUDIENCE,
        algorithm: 'HS256',
      },
    );
    return { challengeToken, expiresIn: MFA_TOKEN_TTL_S };
  }

  async verifyOtp(
    dto: VerifyOtpRequest,
    meta: RequestMeta,
  ): Promise<IssuedSession> {
    const userId = await this.readChallenge(dto.challengeToken);
    const user = await this.verifyStepUp(userId, dto.code, meta, 'LOGIN_OTP');
    const refreshToken = await this.tokens.createSession(user.id, meta);
    return { response: await this.buildAccessResponse(user), refreshToken };
  }

  async refresh(
    rawToken: string | undefined,
    meta: RequestMeta,
  ): Promise<IssuedSession> {
    const { userId, refreshToken } = await this.tokens.rotate(rawToken, meta);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (this.isLocked(user))
      throw new UnauthorizedException('Acceso bloqueado temporalmente');
    return { response: await this.buildAccessResponse(user), refreshToken };
  }

  async logout(rawToken: string | undefined, meta: RequestMeta): Promise<void> {
    const userId = await this.tokens.revoke(rawToken);
    if (userId)
      await this.audit.record({
        action: 'LOGOUT',
        outcome: 'SUCCESS',
        userId,
        meta,
      });
  }

  /**
   * Verifica un código TOTP del usuario: se usa en el login y para confirmar
   * operaciones (transferencias). Registra el paso usado para impedir replays.
   *
   * En una operación el usuario ya está autenticado: un código inválido es 403
   * (no autorizado para ESTA operación), no 401. Así el cliente no confunde el
   * fallo con un token expirado ni reenvía el mismo código tras renovar sesión.
   */
  async verifyStepUp(
    userId: string,
    code: string,
    meta: RequestMeta,
    action: 'LOGIN_OTP' | 'TRANSFER',
  ): Promise<User> {
    const reject = (message: string): HttpException =>
      action === 'TRANSFER'
        ? new ForbiddenException(message)
        : new UnauthorizedException(message);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || this.isLocked(user)) throw reject(INVALID_CREDENTIALS);

    const check = await this.totp.check(
      user.totpSecretEnc,
      code,
      user.lastTotpStep,
    );
    if (!check.valid) {
      await this.registerFailure(user.id, meta);
      await this.audit.record({
        action,
        outcome: 'FAILURE',
        userId,
        meta,
        metadata: { reason: 'OTP_INVALID' },
      });
      throw reject('Código de verificación inválido o ya utilizado');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastTotpStep: check.timeStep,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });
    if (action === 'LOGIN_OTP') {
      await this.audit.record({ action, outcome: 'SUCCESS', userId, meta });
    }
    return updated;
  }

  private async readChallenge(token: string): Promise<string> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.mfaSecret,
        issuer: JWT_ISSUER,
        audience: MFA_AUDIENCE,
        algorithms: ['HS256'],
      });
      return payload.sub;
    } catch {
      throw new UnauthorizedException(
        'El reto de verificación expiró. Vuelve a iniciar sesión.',
      );
    }
  }

  private isLocked(user: Pick<User, 'lockedUntil'>): boolean {
    return Boolean(user.lockedUntil && user.lockedUntil > new Date());
  }

  /** Incremento atómico: varios intentos concurrentes no pueden saltarse el límite. */
  private async registerFailure(
    userId: string,
    meta: RequestMeta,
  ): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: { increment: 1 } },
    });
    if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedAttempts: 0,
          lockedUntil: new Date(Date.now() + LOCK_DURATION_MS),
        },
      });
      await this.audit.record({
        action: 'ACCOUNT_LOCKED',
        outcome: 'SUCCESS',
        userId,
        meta,
      });
    }
  }

  private async buildAccessResponse(user: User): Promise<AccessTokenResponse> {
    return {
      accessToken: await this.tokens.signAccessToken({
        sub: user.id,
        name: user.fullName,
      }),
      expiresIn: ACCESS_TOKEN_TTL_S,
      user: { id: user.id, fullName: user.fullName, email: user.email },
    };
  }
}
