import { toApiError } from './errors';
import { notifySessionExpired, refreshSession } from './session';
import { tokenStore } from './token-store';

/** Endpoints que no deben disparar un refresh automático ante un 401. */
const NO_REFRESH = [
  '/api/auth/login',
  '/api/auth/otp',
  '/api/auth/refresh',
  '/api/auth/csrf',
];

function withAuth(init: RequestInit): RequestInit {
  const headers = new Headers(init.headers);
  const token = tokenStore.get();
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (init.body && !headers.has('content-type'))
    headers.set('content-type', 'application/json');
  return { ...init, headers, credentials: 'same-origin' };
}

/**
 * Cliente HTTP de toda la app y mutator de Orval (ADR-0019):
 * Bearer token, refresh transparente ante un 401 (un solo reintento) y errores tipados.
 */
export async function apiFetch<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  let response = await fetch(url, withAuth(init));

  if (
    response.status === 401 &&
    !NO_REFRESH.some((path) => url.startsWith(path))
  ) {
    const session = await refreshSession();
    if (!session) {
      notifySessionExpired();
      throw await toApiError(response);
    }
    response = await fetch(url, withAuth(init));
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
