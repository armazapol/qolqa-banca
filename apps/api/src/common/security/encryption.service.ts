import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import { decryptAesGcm, encryptAesGcm } from './aes-gcm';

/** Cifrado de datos que deben poder recuperarse (secretos TOTP), ADR-0018. */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService<Env, true>) {
    this.key = Buffer.from(
      config.getOrThrow<string>('TOTP_ENCRYPTION_KEY'),
      'base64',
    );
  }

  encrypt(plaintext: string): string {
    return encryptAesGcm(this.key, plaintext);
  }

  decrypt(payload: string): string {
    return decryptAesGcm(this.key, payload);
  }
}
