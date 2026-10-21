import { readDocumentNonce } from './csp/nonce';

/**
 * GA4 con Consent Mode v2 en modo básico (ADR-0021):
 * - gtag.js NO se descarga hasta que el usuario acepta la analítica.
 * - Publicidad siempre denegada; señales de Google desactivadas.
 * - Nunca se envían importes, cuentas ni datos personales.
 */
/** Se lee al usarse (no al cargar el módulo): configurable por entorno y en tests. */
const measurementId = (): string | undefined =>
  import.meta.env.VITE_GA_MEASUREMENT_ID;

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

let loaded = false;

/** gtag respeta window['ga-disable-<ID>'] para dejar de medir de inmediato. */
function setGaDisabled(id: string, disabled: boolean): void {
  (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = disabled;
}
let granted = false;

export type AnalyticsParams = Record<string, string | number | boolean>;

export function isAnalyticsConfigured(): boolean {
  return Boolean(measurementId());
}

function gtag(...args: unknown[]): void {
  window.gtag?.(...args);
}

export function grantAnalytics(): void {
  const id = measurementId();
  if (!id || typeof window === 'undefined') return;
  granted = true;
  setGaDisabled(id, false);

  if (!loaded) {
    loaded = true;
    window.dataLayer = window.dataLayer ?? [];
    // gtag exige el objeto `arguments`, no un array.
    window.gtag = function gtagShim() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
    gtag('js', new Date());
    gtag('config', id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    const nonce = readDocumentNonce();
    if (nonce) script.nonce = nonce;
    document.head.appendChild(script);
  }

  gtag('consent', 'update', { analytics_storage: 'granted' });
}

/** Revocar: se deja de medir y se borran las cookies de GA del navegador. */
export function denyAnalytics(): void {
  granted = false;
  const id = measurementId();
  if (!id || typeof window === 'undefined') return;
  setGaDisabled(id, true);
  if (loaded) gtag('consent', 'update', { analytics_storage: 'denied' });
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (name?.startsWith('_ga')) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${window.location.hostname}`;
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }
}

export function trackEvent(name: string, params: AnalyticsParams = {}): void {
  if (!granted) return;
  gtag('event', name, params);
}

/**
 * Página vista con la RUTA, no la URL: /app/movimientos/:accountId en lugar
 * del identificador real, y sin query string.
 */
export function trackPageView(routePath: string, title: string): void {
  trackEvent('page_view', {
    page_path: routePath,
    page_location: `${window.location.origin}${routePath}`,
    page_title: title,
  });
}
