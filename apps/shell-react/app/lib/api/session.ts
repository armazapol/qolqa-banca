import {
  type AccessTokenResponse,
  accessTokenResponseSchema,
  CSRF_HEADER,
  csrfTokenResponseSchema,
} from '@qolqa/contracts';
import { toApiError } from './errors';
import { tokenStore } from './token-store';

const REFRESH_LOCK = 'qolqa-session-refresh';
export const SESSION_EXPIRED_EVENT = 'qolqa:session-expired';

let csrfToken: string | null = null;
let inFlight: Promise<AccessTokenResponse | null> | null = null;

/** Token CSRF en memoria; la cookie la fija el BFF (double-submit firmado). */
async function getCsrfToken(force = false): Promise<string> {
  if (csrfToken && !force) return csrfToken;
  const response = await fetch('/api/auth/csrf', {
    credentials: 'same-origin',
  });
  if (!response.ok) throw await toApiError(response);
  csrfToken = csrfTokenResponseSchema.parse(await response.json()).csrfToken;
  return csrfToken;
}

async function postWithCsrf(path: string): Promise<Response> {
  const send = async (force: boolean) =>
    fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { [CSRF_HEADER]: await getCsrfToken(force) },
    });
  const response = await send(false);
  // Si la cookie CSRF expiró o se borró, se pide un token nuevo una sola vez.
  return response.status === 403 ? send(true) : response;
}

async function doRefresh(): Promise<AccessTokenResponse | null> {
  const response = await postWithCsrf('/api/auth/refresh');
  if (!response.ok) {
    tokenStore.clear();
    return null;
  }
  const session = accessTokenResponseSchema.parse(await response.json());
  tokenStore.set(session.accessToken, session.expiresIn);
  return session;
}

/**
 * Renueva el access token con la cookie httpOnly.
 * - Dentro de la pestaña: las llamadas concurrentes comparten la misma promesa.
 * - Entre pestañas: Web Locks serializa los refresh. Sin esto, dos pestañas
 *   usarían el mismo refresh token y el BFF lo trataría como robo (ADR-0018).
 */
export function refreshSession(): Promise<AccessTokenResponse | null> {
  inFlight ??= (
    typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request(REFRESH_LOCK, doRefresh)
      : doRefresh()
  ).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function storeSession(session: AccessTokenResponse): void {
  tokenStore.set(session.accessToken, session.expiresIn);
}

export async function logoutSession(): Promise<void> {
  try {
    await postWithCsrf('/api/auth/logout');
  } finally {
    tokenStore.clear();
    csrfToken = null;
  }
}

/** Avisa a la UI de que la sesión terminó (refresh rechazado o revocado). */
export function notifySessionExpired(): void {
  tokenStore.clear();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
