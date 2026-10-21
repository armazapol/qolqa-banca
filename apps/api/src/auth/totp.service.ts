import { Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verify } from 'otplib';
import { EncryptionService } from '../common/security/encryption.service';

export type TotpCheck = { valid: true; timeStep: number } | { valid: false };

/** TOTP RFC 6238 (30 s, 6 dígitos, SHA-1), compatible con Google Authenticator. */
@Injectable()
export class TotpService {
  constructor(private readonly encryption: EncryptionService) {}

  createSecret(): { secret: string; encrypted: string } {
    const secret = generateSecret();
    return { secret, encrypted: this.encryption.encrypt(secret) };
  }

  otpauthUri(email: string, secret: string): string {
    return generateURI({ issuer: 'Qolqa Banca Digital', label: email, secret });
  }

  /**
   * Acepta el periodo actual y el anterior (desfase de reloj del móvil) y
   * rechaza cualquier paso ya usado: un código interceptado no se puede reutilizar.
   */
  async check(
    encryptedSecret: string,
    code: string,
    lastTimeStep: number,
  ): Promise<TotpCheck> {
    const result = await verify({
      secret: this.encryption.decrypt(encryptedSecret),
      token: code,
      epochTolerance: [30, 0],
      afterTimeStep: lastTimeStep,
    });
    // verify() tipa una unión TOTP | HOTP; solo el resultado TOTP trae timeStep.
    return result.valid && 'timeStep' in result
      ? { valid: true, timeStep: result.timeStep }
      : { valid: false };
  }
}
