import type { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import type { Env } from '../../config/env';
import { decryptAesGcm, encryptAesGcm } from './aes-gcm';
import { CsrfService } from './csrf.service';

const key = randomBytes(32);

describe('AES-256-GCM', () => {
  it('cifra y descifra (round trip)', () => {
    const payload = encryptAesGcm(key, 'JBSWY3DPEHPK3PXP');
    expect(payload).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptAesGcm(key, payload)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('usa un IV distinto en cada cifrado', () => {
    expect(encryptAesGcm(key, 'x')).not.toBe(encryptAesGcm(key, 'x'));
  });

  it('detecta un texto cifrado manipulado', () => {
    const [version, iv, tag, ciphertext] = encryptAesGcm(key, 'secreto').split(
      '.',
    );
    const tampered = Buffer.from(ciphertext ?? '', 'base64url');
    tampered[0] = (tampered[0] ?? 0) ^ 0xff;
    expect(() =>
      decryptAesGcm(
        key,
        [version, iv, tag, tampered.toString('base64url')].join('.'),
      ),
    ).toThrow();
  });

  it('falla con otra clave', () => {
    expect(() =>
      decryptAesGcm(randomBytes(32), encryptAesGcm(key, 'secreto')),
    ).toThrow();
  });
});

describe('CsrfService (signed double-submit)', () => {
  const config = {
    getOrThrow: () => randomBytes(32).toString('base64'),
  } as unknown as ConfigService<Env, true>;
  const csrf = new CsrfService(config);

  it('acepta cookie y cabecera idénticas con firma válida', () => {
    const token = csrf.issue();
    expect(csrf.verify(token, token)).toBe(true);
  });

  it('rechaza si la cabecera no coincide con la cookie', () => {
    expect(csrf.verify(csrf.issue(), csrf.issue())).toBe(false);
  });

  it('rechaza un token plantado sin firma válida', () => {
    const forged = 'nonce-del-atacante.firma-falsa';
    expect(csrf.verify(forged, forged)).toBe(false);
  });

  it('rechaza si falta la cabecera', () => {
    expect(csrf.verify(csrf.issue(), undefined)).toBe(false);
  });
});
