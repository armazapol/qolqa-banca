import type { VitePWAOptions } from 'vite-plugin-pwa';

/**
 * PWA (ADR-0021). Reglas de caché pensadas para una banca:
 * - Precache mínimo (CSS, fuentes, iconos): la primera visita no descarga toda la app.
 * - JS con hash: se guarda al usarse (CacheFirst; el hash garantiza que no cambia).
 * - Páginas públicas: NetworkFirst (sin conexión se ve la última versión).
 * - /app, /ingresar y /api: NUNCA se guardan en el dispositivo.
 * - Sin conexión en el área privada se muestra una página propia.
 *
 * Las funciones de `runtimeCaching` se serializan dentro del service worker:
 * no pueden usar variables de este archivo.
 */
export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'prompt',
  injectRegister: false,
  manifestFilename: 'manifest.webmanifest',
  includeAssets: ['icons/favicon.svg'],
  manifest: {
    id: '/',
    name: 'Qolqa Banca Digital',
    short_name: 'Qolqa',
    description:
      'Tu banca por internet: cuentas, transferencias seguras y tipo de cambio en tiempo real.',
    lang: 'es-PE',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#0B4F5C',
    background_color: '#F5F7F7',
    categories: ['finance'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
  workbox: {
    globPatterns: ['assets/**/*.{css,woff2}', 'icons/*.{png,svg}'],
    // El HTML prerenderizado se genera después del build del cliente: no se precachea.
    navigateFallback: null,
    cleanupOutdatedCaches: true,
    clientsClaim: false,
    skipWaiting: false,
    runtimeCaching: [
      {
        urlPattern: ({ url, sameOrigin }) =>
          sameOrigin &&
          url.pathname.startsWith('/assets/') &&
          url.pathname.endsWith('.js'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'qolqa-assets',
          expiration: { maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        urlPattern: ({ request, url }) =>
          request.mode === 'navigate' &&
          !url.pathname.startsWith('/app') &&
          !url.pathname.startsWith('/ingresar'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'qolqa-paginas-publicas',
          networkTimeoutSeconds: 4,
          expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [200] },
          plugins: [
            {
              handlerDidError: async () =>
                new Response(
                  '<!doctype html><html lang="es-PE"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión · Qolqa</title><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#12201F"><h1>Sin conexión</h1><p>No pudimos cargar esta página. Revisa tu conexión a internet e inténtalo nuevamente.</p></body></html>',
                  { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
                ),
            },
          ],
        },
      },
      {
        // Área privada: siempre red. Sin conexión, aviso propio (nada sensible en caché).
        urlPattern: ({ request }) => request.mode === 'navigate',
        handler: 'NetworkOnly',
        options: {
          plugins: [
            {
              handlerDidError: async () =>
                new Response(
                  '<!doctype html><html lang="es-PE"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión · Qolqa</title><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#12201F"><h1>Sin conexión</h1><p>Por tu seguridad, tu banca solo funciona con conexión a internet. Ningún dato de tus cuentas se guarda en este dispositivo.</p></body></html>',
                  { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
                ),
            },
          ],
        },
      },
    ],
  },
  devOptions: { enabled: false },
};
