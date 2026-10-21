/**
 * Content Security Policy del shell (ADR-0021). La comparten:
 * - entry.server.tsx: documentos SSR con nonce por petición.
 * - scripts/csp-static.ts: documentos prerenderizados con hashes del build.
 */
export interface CspOptions {
  /** 'nonce-…' o 'sha256-…' que autorizan los scripts inline del documento. */
  scriptTokens: string[];
  /** Origen del BFF para WebSocket (p. ej. https://api.qolqa.pe). */
  wsOrigin?: string;
  /** DSN de Sentry: se permite enviar eventos a su origen. */
  sentryDsn?: string;
  /** GA4 configurado: se permiten sus dominios (solo se carga con consentimiento). */
  analytics: boolean;
  /** En producción se fuerza HTTPS para cualquier recurso. */
  upgradeInsecure: boolean;
  /**
   * Área privada: el microfrontend Angular se carga con es-module-shims, que
   * ejecuta los módulos desde URLs blob: (ADR-0022). Las páginas públicas no lo necesitan.
   */
  blobModules?: boolean;
}

const GA_SCRIPT = ['https://www.googletagmanager.com'];
const GA_CONNECT = [
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://*.googletagmanager.com',
];
const BINANCE = 'wss://data-stream.binance.vision';

function websocketOrigin(httpOrigin: string | undefined): string[] {
  if (!httpOrigin) return [];
  const url = new URL(httpOrigin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return [url.origin];
}

function originOf(url: string | undefined): string[] {
  if (!url) return [];
  try {
    return [new URL(url).origin];
  } catch {
    return [];
  }
}

export function buildCsp(options: CspOptions): string {
  const ga = options.analytics;
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // Sin 'unsafe-inline': cada script inline lleva nonce o está en la lista de hashes.
    'script-src': [
      "'self'",
      ...options.scriptTokens,
      ...(options.blobModules ? ['blob:'] : []),
      ...(ga ? GA_SCRIPT : []),
    ],
    // MUI (Emotion) y Angular inyectan <style> en tiempo de ejecución.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', ...(ga ? GA_CONNECT : [])],
    'font-src': ["'self'"],
    'connect-src': [
      "'self'",
      BINANCE,
      ...websocketOrigin(options.wsOrigin),
      ...originOf(options.sentryDsn),
      ...(ga ? GA_CONNECT : []),
    ],
    'worker-src': ["'self'"],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    // Antisecuestro de clics: la banca no puede embeberse en otro sitio.
    'frame-ancestors': ["'none'"],
  };

  const policy = Object.entries(directives).map(
    ([name, values]) => `${name} ${values.join(' ')}`,
  );
  if (options.upgradeInsecure) policy.push('upgrade-insecure-requests');
  return policy.join('; ');
}

/**
 * ¿El documento se sirve por HTTPS? Detrás de Vercel llega en x-forwarded-proto.
 * `upgrade-insecure-requests` solo tiene sentido en HTTPS: sobre http://localhost
 * WebKit lo aplica igual y bloquea todos los recursos (lo detectó la batería E2E).
 */
export function isHttpsRequest(request: Request): boolean {
  return (
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ===
      'https' || new URL(request.url).protocol === 'https:'
  );
}

/**
 * Documentos del área privada: /ingresar y /app/*. Desde las páginas públicas se
 * llega con navegación completa (reloadDocument), así que su CSP es la que rige
 * mientras dura la sesión.
 */
export function isPrivateAreaPath(pathname: string): boolean {
  return /^\/(ingresar|app)(\/|$)/.test(pathname);
}

/** Configuración tomada de las variables de entorno del build. */
export function cspFromEnv(
  scriptTokens: string[],
  options: { production: boolean; https: boolean; privateArea?: boolean },
): string {
  return buildCsp({
    scriptTokens,
    wsOrigin:
      import.meta.env.VITE_WS_URL ??
      (options.production ? undefined : 'http://localhost:3000'),
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
    analytics: Boolean(import.meta.env.VITE_GA_MEASUREMENT_ID),
    upgradeInsecure: options.production && options.https,
    blobModules: options.privateArea,
  });
}
