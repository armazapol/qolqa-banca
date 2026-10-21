import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuditService } from '../audit/audit.service';
import type { Env } from '../config/env';
import type { PrismaService } from '../prisma/prisma.service';
import { INVALID_CREDENTIALS, MAX_FAILED_ATTEMPTS } from './auth.constants';
import { AuthService } from './auth.service';
import type { PasswordService } from './password.service';
import type { TokenService } from './token.service';
import type { TotpService } from './totp.service';

const meta = { ip: '127.0.0.1', userAgent: 'jest' };

const baseUser = {
  id: 'user-1',
  email: 'lucia@demo.qolqa.pe',
  fullName: 'Lucía',
  passwordHash: 'hash',
  totpSecretEnc: 'enc',
  lastTotpStep: 100,
  failedAttempts: 0,
  lockedUntil: null as Date | null,
};

function setup(
  user: typeof baseUser | null,
  opts: { passwordOk?: boolean; otpOk?: boolean } = {},
) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockImplementation(({ data }) => ({
        ...user,
        failedAttempts:
          data.failedAttempts?.increment !== undefined
            ? (user?.failedAttempts ?? 0) + 1
            : (data.failedAttempts ?? user?.failedAttempts),
        ...('lastTotpStep' in data ? { lastTotpStep: data.lastTotpStep } : {}),
      })),
    },
  };
  const passwords = {
    verify: jest.fn().mockResolvedValue(opts.passwordOk ?? true),
  };
  const totp = {
    check: jest
      .fn()
      .mockResolvedValue(
        opts.otpOk === false
          ? { valid: false }
          : { valid: true, timeStep: 101 },
      ),
  };
  const tokens = {
    signAccessToken: jest.fn().mockResolvedValue('access'),
    createSession: jest.fn().mockResolvedValue('refresh'),
  };
  const audit = { record: jest.fn() };
  const config = { get: () => 'mfa-secret' } as unknown as ConfigService<
    Env,
    true
  >;
  const service = new AuthService(
    prisma as unknown as PrismaService,
    passwords as unknown as PasswordService,
    totp as unknown as TotpService,
    tokens as unknown as TokenService,
    new JwtService(),
    audit as unknown as AuditService,
    config,
  );
  return { service, prisma, passwords, totp, audit };
}

describe('AuthService.login', () => {
  it('devuelve un reto MFA si la contraseña es correcta', async () => {
    const { service } = setup(baseUser);
    const result = await service.login(
      { email: baseUser.email, password: 'Correcta123' },
      meta,
    );
    expect(result.challengeToken).toEqual(expect.any(String));
  });

  it('usa el mismo mensaje si el usuario no existe (sin enumeración)', async () => {
    const { service, passwords } = setup(null);
    await expect(
      service.login(
        { email: 'nadie@demo.qolqa.pe', password: 'Cualquiera1' },
        meta,
      ),
    ).rejects.toThrow(INVALID_CREDENTIALS);
    // Igual se ejecuta Argon2 para no revelar la inexistencia por tiempo de respuesta.
    expect(passwords.verify).toHaveBeenCalledWith(null, 'Cualquiera1');
  });

  it('cuenta el intento fallido y bloquea al llegar al máximo', async () => {
    const user = { ...baseUser, failedAttempts: MAX_FAILED_ATTEMPTS - 1 };
    const { service, prisma, audit } = setup(user, { passwordOk: false });

    await expect(
      service.login({ email: user.email, password: 'Incorrecta1' }, meta),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.user.update).toHaveBeenLastCalledWith({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: expect.any(Date) },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ACCOUNT_LOCKED' }),
    );
  });

  it('rechaza a un usuario bloqueado aunque la contraseña sea correcta', async () => {
    const user = { ...baseUser, lockedUntil: new Date(Date.now() + 60_000) };
    const { service } = setup(user, { passwordOk: true });
    await expect(
      service.login({ email: user.email, password: 'Correcta123' }, meta),
    ).rejects.toThrow(INVALID_CREDENTIALS);
  });
});

describe('AuthService.verifyStepUp', () => {
  it('guarda el paso TOTP usado para impedir reutilizar el código', async () => {
    const { service, prisma, totp } = setup(baseUser);
    await service.verifyStepUp(baseUser.id, '123456', meta, 'TRANSFER');

    expect(totp.check).toHaveBeenCalledWith('enc', '123456', 100);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: baseUser.id },
      data: { lastTotpStep: 101, failedAttempts: 0, lockedUntil: null },
    });
  });

  it('un código inválido cuenta como intento fallido', async () => {
    const { service, prisma } = setup(baseUser, { otpOk: false });
    await expect(
      service.verifyStepUp(baseUser.id, '000000', meta, 'TRANSFER'),
    ).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: baseUser.id },
      data: { failedAttempts: { increment: 1 } },
    });
  });
});
