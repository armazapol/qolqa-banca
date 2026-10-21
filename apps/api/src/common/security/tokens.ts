import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Token opaco aleatorio (256 bits) en base64url. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Hash para guardar tokens en base de datos sin poder reutilizarlos si se filtran. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Comparación en tiempo constante: no revela cuántos caracteres coinciden. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
