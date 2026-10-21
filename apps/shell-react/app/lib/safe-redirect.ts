const DEFAULT_TARGET = '/app';

/**
 * Evita open redirects: solo se aceptan rutas internas del área privada.
 * Rechaza "//evil.com", "/\evil.com", URLs absolutas y esquemas como javascript:.
 */
export function safeRedirect(target: string | null | undefined): string {
  if (
    !target ||
    !target.startsWith('/app') ||
    target.startsWith('//') ||
    target.includes('\\')
  ) {
    return DEFAULT_TARGET;
  }
  try {
    // Se valida la ruta ya normalizada: "/app/../../evil" se convierte en "/evil".
    const url = new URL(target, 'https://qolqa.local');
    const isPrivateArea =
      url.pathname === '/app' || url.pathname.startsWith('/app/');
    return url.origin === 'https://qolqa.local' && isPrivateArea
      ? `${url.pathname}${url.search}`
      : DEFAULT_TARGET;
  } catch {
    return DEFAULT_TARGET;
  }
}
