import type { Config } from '@react-router/dev/config';

/**
 * ADR-0004: SSR activo + prerender en build de las páginas estáticas.
 * El resto de rutas públicas (/tipo-de-cambio) se renderiza en el servidor
 * y /app/* solo en el cliente (clientLoader + HydrateFallback).
 */
export default {
  ssr: true,
  prerender: ['/', '/seguridad', '/legal/privacidad', '/legal/cookies'],
} satisfies Config;
