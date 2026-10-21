import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';

/**
 * AES-256-GCM: cifrado autenticado, cualquier alteración del texto cifrado falla.
 * Formato: v1.<iv>.<authTag>.<ciphertext> en base64url.
 */
export function encryptAesGcm(key: Buffer, plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  return [
    VERSION,
    ...[iv, cipher.getAuthTag(), ciphertext].map((part) =>
      part.toString('base64url'),
    ),
  ].join('.');
}

export function decryptAesGcm(key: Buffer, payload: string): string {
  const [version, iv, tag, ciphertext] = payload.split('.');
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error('Formato de cifrado no soportado');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
