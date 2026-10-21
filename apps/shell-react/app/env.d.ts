/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Variables públicas del front (se incrustan en el build). Todas opcionales: sin ellas, la función queda desactivada. */
interface ImportMetaEnv {
  /** ID de medición de GA4 (G-XXXXXXX). */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** DSN público de Sentry para el navegador y el SSR. */
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  /** Origen del BFF para WebSockets (Vercel no los reenvía). */
  readonly VITE_WS_URL?: string;
  readonly VITE_INVESTMENTS_REMOTE_ENTRY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
