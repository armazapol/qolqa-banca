/**
 * Limpieza de datos sensibles antes de enviarlos a terceros (Sentry, logs).
 * La usan el shell y el BFF: una sola definición de "qué no debe salir" (ADR-0021).
 */
const PATTERNS: [RegExp, string][] = [
  // JWT (tres segmentos base64url).
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[JWT]'],
  // Cabeceras Bearer.
  [/\bBearer\s+[\w.~+/-]+=*/gi, 'Bearer [REDACTED]'],
  // Correos electrónicos.
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[EMAIL]'],
  // Tarjetas, cuentas (14) y CCI (20): secuencias largas de dígitos, con o sin espacios.
  [/\b\d(?:[ -]?\d){12,19}\b/g, '[NUMERO]'],
  // DNI (8 dígitos aislados).
  [/\b\d{8}\b/g, '[DNI]'],
];

export function redactSensitive(text: string): string {
  return PATTERNS.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    text,
  );
}

/** Quita la query string: puede contener tokens, correos o identificadores. */
export function stripQuery(url: string): string {
  const index = url.search(/[?#]/);
  return index === -1 ? url : url.slice(0, index);
}

/** Cabeceras que nunca deben salir del sistema. */
export const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-csrf-token',
];
