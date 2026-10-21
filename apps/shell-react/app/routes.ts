import {
  index,
  layout,
  route,
  type RouteConfig,
} from '@react-router/dev/routes';

/**
 * Renderizado por ruta (ADR-0004):
 * - Públicas estáticas: prerenderizadas en build (react-router.config.ts).
 * - /tipo-de-cambio: SSR con caché en CDN.
 * - /app/*: solo cliente (clientLoader + HydrateFallback), datos privados.
 */
export default [
  layout('routes/public/layout.tsx', [
    index('routes/public/home.tsx'),
    route('seguridad', 'routes/public/seguridad.tsx'),
    route('legal/privacidad', 'routes/public/privacidad.tsx'),
    route('legal/cookies', 'routes/public/cookies.tsx'),
    route('tipo-de-cambio', 'routes/public/tipo-de-cambio.tsx'),
  ]),
  route('ingresar', 'routes/ingresar.tsx'),
  route('app', 'routes/app/layout.tsx', [
    index('routes/app/dashboard.tsx'),
    route('movimientos/:accountId', 'routes/app/movimientos.tsx'),
    route('transferir', 'routes/app/transferir.tsx'),
    route('perfil', 'routes/app/perfil.tsx'),
    route('inversiones', 'routes/app/inversiones.tsx'),
  ]),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
