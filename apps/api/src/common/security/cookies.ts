import type { CookieOptions } from 'express';

/**
 * En producción se usa el prefijo __Host-: el navegador exige Secure, Path=/
 * y prohíbe Domain, así un subdominio no puede inyectar o pisar la cookie.
 */
export function cookieNames(production: boolean) {
  const prefix = production ? '__Host-' : '';
  return {
    refresh: `${prefix}qolqa_rt`,
    csrf: `${prefix}qolqa_csrf`,
  };
}

export function refreshCookieOptions(
  production: boolean,
  maxAgeMs: number,
): CookieOptions {
  return {
    httpOnly: true,
    secure: production,
    sameSite: 'strict',
    path: '/',
    maxAge: maxAgeMs,
  };
}

/** La cookie CSRF debe ser legible por JS para copiarla en la cabecera (double-submit). */
export function csrfCookieOptions(production: boolean): CookieOptions {
  return {
    httpOnly: false,
    secure: production,
    sameSite: 'strict',
    path: '/',
  };
}
