import { reactRouter } from '@react-router/dev/vite';
import { sentryReactRouter } from '@sentry/react-router/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaOptions } from './pwa.config.ts';

const API_TARGET = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';
const INVESTMENTS_TARGET =
  process.env.INVESTMENTS_PROXY_TARGET ?? 'http://localhost:4201';

// Solo en CI (ADR-0023): org, proyecto y release llegan por SENTRY_ORG, SENTRY_PROJECT y SENTRY_RELEASE.
const uploadSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default defineConfig(async (config) => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/shell-react',
  server: {
    port: 5173,
    host: 'localhost',
    // Mismo origen también en desarrollo (ADR-0019): cookies SameSite=Strict y sin CORS,
    // igual que el rewrite /api/* de Vercel en producción.
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: false },
      // Microfrontend Angular bajo el mismo origen (ADR-0020), como el rewrite de Vercel.
      '/mf/investments': {
        target: INVESTMENTS_TARGET,
        rewrite: (path) => path.replace(/^\/mf\/investments/, ''),
      },
    },
  },
  preview: {
    port: 5173,
    host: 'localhost',
  },
  plugins: [
    tailwindcss(),
    reactRouter(),
    VitePWA(pwaOptions),
    ...(uploadSourceMaps
      ? await sentryReactRouter({ telemetry: false }, config)
      : []),
  ],
  // Pre-optimiza las dependencias de todas las rutas al arrancar: sin recargas
  // inesperadas la primera vez que se visita cada ruta en desarrollo.
  optimizeDeps: { entries: ['./app/**/*.tsx'] },
  build: {
    reportCompressedSize: true,
  },
}));
