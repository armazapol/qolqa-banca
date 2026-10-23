/**
 * Orígenes web admitidos por CORS y por el WebSocket (ADR-0023): el de
 * producción y, opcionalmente, los previews de Vercel de los PR.
 *
 * El patrón de previews admite un único `*`, que solo cubre letras minúsculas,
 * dígitos y guiones (p. ej. `https://qolqa-banca-*-equipo.vercel.app`): no puede
 * coincidir con otro dominio ni con un subdominio arbitrario.
 */
export function createOriginMatcher(
  webOrigin: string,
  previewPattern?: string,
): (origin: string | undefined) => boolean {
  const exact = new URL(webOrigin).origin;
  const preview = previewPattern ? patternToRegExp(previewPattern) : undefined;
  return (origin) =>
    origin !== undefined &&
    (origin === exact || (preview?.test(origin) ?? false));
}

function patternToRegExp(pattern: string): RegExp {
  const parts = pattern.split('*');
  if (parts.length !== 2) {
    throw new Error('WEB_ORIGIN_PREVIEW debe contener exactamente un "*"');
  }
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escape(parts[0])}[a-z0-9-]+${escape(parts[1])}$`);
}
