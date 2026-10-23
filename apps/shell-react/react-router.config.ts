import type { Config } from '@react-router/dev/config';
import { sentryOnBuildEnd } from '@sentry/react-router/vite';
import { vercelPreset } from '@vercel/react-router/vite';

/**
 * ADR-0004: SSR activo + prerender en build de las páginas estáticas.
 * El resto de rutas públicas (/tipo-de-cambio) se renderiza en el servidor
 * y /app/* solo en el cliente (clientLoader + HydrateFallback).
 *
 * ADR-0023: el preset de Vercel solo se aplica en `vercel build` (que define
 * VERCEL=1); el build local y la batería E2E siguen con react-router-serve.
 * Con SENTRY_AUTH_TOKEN (solo en CI) se suben los source maps y se borran del build.
 */
export default {
  ssr: true,
  prerender: ['/', '/seguridad', '/legal/privacidad', '/legal/cookies'],
  presets: process.env.VERCEL ? [vercelPreset()] : [],
  ...(process.env.SENTRY_AUTH_TOKEN && { buildEnd: sentryOnBuildEnd }),
} satisfies Config;
