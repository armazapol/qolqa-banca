export const ACCESS_TOKEN_TTL_S = 5 * 60;
export const MFA_TOKEN_TTL_S = 5 * 60;
/** Ventana deslizante: cada rotación renueva 30 min; sin actividad, la sesión muere. */
export const REFRESH_TOKEN_TTL_MS = 30 * 60 * 1000;
export const WS_TICKET_TTL_MS = 30 * 1000;

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;

export const JWT_ISSUER = 'qolqa-bff';
export const ACCESS_AUDIENCE = 'qolqa-api';
export const MFA_AUDIENCE = 'qolqa-mfa';

/** Mensaje único para no revelar si el correo existe (enumeración de usuarios). */
export const INVALID_CREDENTIALS =
  'Credenciales inválidas. Tras 5 intentos fallidos el acceso se bloquea 15 minutos.';
