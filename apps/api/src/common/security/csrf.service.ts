import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import type { Env } from '../../config/env';
import { randomToken, safeEqual } from './tokens';

/**
 * Double-submit cookie firmado (OWASP "Signed Double-Submit Cookie").
 * Token = <nonce>.<HMAC(nonce)>: un atacante que logre plantar una cookie
 * no puede fabricar un token válido sin conocer el secreto.
 */
@Injectable()
export class CsrfService {
  private readonly secret: Buffer;

  constructor(config: ConfigService<Env, true>) {
    this.secret = Buffer.from(
      config.getOrThrow<string>('CSRF_SECRET'),
      'base64',
    );
  }

  issue(): string {
    const nonce = randomToken(16);
    return `${nonce}.${this.sign(nonce)}`;
  }

  /** Válido si cookie y cabecera coinciden y la firma es auténtica. */
  verify(
    cookieToken: string | undefined,
    headerToken: string | undefined,
  ): boolean {
    if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken))
      return false;
    const [nonce, signature] = cookieToken.split('.');
    return Boolean(
      nonce && signature && safeEqual(signature, this.sign(nonce)),
    );
  }

  private sign(nonce: string): string {
    return createHmac('sha256', this.secret).update(nonce).digest('base64url');
  }
}
