import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuditService } from '../audit/audit.service';
import { sha256 } from '../common/security/tokens';
import type { Env } from '../config/env';
import type { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';

const meta = { ip: '127.0.0.1', userAgent: 'jest' };

function setup(stored: Record<string, unknown> | null, updatedCount = 1) {
  const prisma = {
    refreshToken: {
      findUnique: jest.fn().mockResolvedValue(stored),
      updateMany: jest.fn().mockResolvedValue({ count: updatedCount }),
      create: jest.fn().mockResolvedValue({}),
    },
  };
  const audit = { record: jest.fn() };
  const config = { get: () => 'secret-de-pruebas' } as unknown as ConfigService<
    Env,
    true
  >;
  const service = new TokenService(
    prisma as unknown as PrismaService,
    new JwtService(),
    audit as unknown as AuditService,
    config,
  );
  return { service, prisma, audit };
}

const activeToken = {
  id: 'rt-1',
  userId: 'user-1',
  familyId: 'family-1',
  usedAt: null,
  revokedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
};

describe('TokenService.rotate', () => {
  it('rota un refresh token válido y emite uno nuevo de la misma familia', async () => {
    const { service, prisma } = setup(activeToken);

    const result = await service.rotate('token-original', meta);

    expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: sha256('token-original') },
    });
    expect(result.userId).toBe('user-1');
    expect(result.refreshToken).not.toBe('token-original');
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        familyId: 'family-1',
        tokenHash: sha256(result.refreshToken),
      }),
    });
  });

  it('detecta la reutilización de un token ya usado y revoca toda la familia', async () => {
    const { service, prisma, audit } = setup({
      ...activeToken,
      usedAt: new Date(),
    });

    await expect(service.rotate('token-robado', meta)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { familyId: 'family-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TOKEN_REUSE_DETECTED' }),
    );
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rechaza un token expirado', async () => {
    const { service } = setup({
      ...activeToken,
      expiresAt: new Date(Date.now() - 1),
    });
    await expect(service.rotate('token', meta)).rejects.toThrow(
      'Sesión expirada',
    );
  });

  it('si dos peticiones rotan a la vez, la perdedora revoca la familia', async () => {
    const { service, prisma } = setup(activeToken, 0);
    await expect(service.rotate('token', meta)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rechaza si no hay cookie', async () => {
    const { service } = setup(null);
    await expect(service.rotate(undefined, meta)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('TokenService access tokens', () => {
  it('firma y verifica un access token con issuer y audience', async () => {
    const { service } = setup(null);
    const token = await service.signAccessToken({
      sub: 'user-1',
      name: 'Lucía',
    });
    await expect(service.verifyAccessToken(token)).resolves.toMatchObject({
      sub: 'user-1',
    });
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const { service } = setup(null);
    const forged = await new JwtService().signAsync(
      { sub: 'admin' },
      { secret: 'otro-secreto', issuer: 'qolqa-bff', audience: 'qolqa-api' },
    );
    await expect(service.verifyAccessToken(forged)).rejects.toThrow();
  });
});
