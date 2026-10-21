/**
 * Access token SOLO en memoria (ADR-0009, ADR-0019). Fuera de Redux a propósito:
 * Redux DevTools y la serialización del estado lo dejarían visible.
 * Desaparece al recargar; la sesión se recupera con la cookie httpOnly.
 */
let accessToken: string | null = null;
let expiresAt = 0;

/** Margen para renovar antes de que el servidor lo rechace. */
const EXPIRY_MARGIN_MS = 15_000;

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },
  set(token: string, expiresInSeconds: number): void {
    accessToken = token;
    expiresAt = Date.now() + expiresInSeconds * 1000;
  },
  isFresh(): boolean {
    return accessToken !== null && Date.now() < expiresAt - EXPIRY_MARGIN_MS;
  },
  clear(): void {
    accessToken = null;
    expiresAt = 0;
  },
};
