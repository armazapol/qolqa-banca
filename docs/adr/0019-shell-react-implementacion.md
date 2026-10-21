# ADR-0019: Implementación del shell React

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Decisiones confirmadas

| #   | Tema                | Decisión                                                                                                | Motivo                                                                                                       |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Cliente HTTP        | `fetch` nativo envuelto en `apiFetch`, que además es el _mutator_ de Orval                              | Centraliza el Bearer token, el refresh ante un 401 y los errores, sin dependencias extra (Axios suma ~13 KB) |
| 2   | Cliente GraphQL     | GraphQL Codegen (`client-preset`, `documentMode: 'string'`) + TanStack Query                            | Una sola caché; las consultas viajan como texto, sin la librería `graphql` en el navegador                   |
| 3   | Access token        | Módulo en memoria (`lib/api/token-store.ts`), **fuera de Redux**                                        | Redux DevTools y la serialización del estado lo dejarían visible                                             |
| 4   | Varias pestañas     | Refresh serializado con la **Web Locks API** y promesa compartida dentro de cada pestaña                | Evita que dos refresh simultáneos activen la detección de robo del BFF (ADR-0018)                            |
| 5   | Proxy en desarrollo | Vite `/api` → `localhost:3000`                                                                          | Local igual que producción: mismo origen y cookies `SameSite=Strict`                                         |
| 6   | Inactividad         | Aviso a los 4 min, cierre a los 5 min; actividad compartida entre pestañas con `BroadcastChannel`       | ADR-0011. Usa la hora real, no timers acumulados, porque el navegador ralentiza los timers en segundo plano  |
| 7   | Gráficos            | MUI X Charts, **cargado de forma diferida** y con curva lineal                                          | Sus ~89 KB gzip no bloquean el render; una curva suavizada inventaría valores entre días                     |
| 8   | Iconos              | `@mui/icons-material` con imports por ruta                                                              | Se empaqueta solo lo que se usa                                                                              |
| 9   | Tipografía          | Inter auto-alojada (`@fontsource-variable/inter`)                                                       | Sin Google Fonts: un tercero menos y una CSP más estricta                                                    |
| 10  | Tema                | Claro/oscuro según el sistema, con selector manual; `InitColorSchemeScript` evita el parpadeo           | Accesibilidad y preferencia del usuario                                                                      |
| 11  | Paleta              | Azul petróleo `#0B4F5C` + dorado `#E0A526`. Contraste medido: texto ≥ 6,7:1, primario 9,2:1, foco ≥ 9:1 | WCAG AA. El dorado (2,19:1 sobre blanco) nunca se usa como texto ni como foco                                |

## Decisiones técnicas tomadas durante la implementación

- **Contrato OpenAPI versionado** (`apps/api/openapi.json`):
  - lo genera el BFF con `node main.js --emit-openapi`, sin base de datos ni puerto;
  - las respuestas se declaran con `@ZodResponse`;
  - el `ZodSerializerInterceptor` además **elimina en ejecución cualquier campo no declarado**, para que nunca se filtre un campo interno.
  - Orval genera a partir de ese archivo; el código generado no se versiona y se regenera en `typecheck`, `build` y `test`.
- **OTP inválido en una operación → 403, no 401:**
  - con 401, el cliente habría renovado la sesión y reenviado el mismo código, sumando dos intentos fallidos de golpe;
  - el login sigue respondiendo 401.
- **`safeRedirect`:** valida la ruta **después** de normalizarla. Un test detectó que `/app/../../evil` pasaba el filtro inicial.
- **Moneda:** `formatCents` usa `S/` y `US$`, como en Perú (la SBS). `Intl` con `es-PE` muestra "USD".
- **Prerender:** `/`, `/seguridad`, `/legal/privacidad` y `/legal/cookies` se generan como HTML en el build. `/tipo-de-cambio` es SSR con `Cache-Control: s-maxage=300` y valida con Zod la respuesta del BFF. `/app/*` usa `clientLoader` + `HydrateFallback`: el servidor nunca renderiza datos privados.
- **404 real** en rutas inexistentes, no un 200 con texto de error (SEO).
- **Lint:**
  - `react/no-danger` en modo error (prevención de XSS);
  - `jsx-a11y` vía `flat/react` de Nx;
  - se excluye el código generado.
- **Vite `optimizeDeps.entries`:** escanea todas las rutas al arrancar, sin recargas inesperadas en desarrollo.

## Testing (ADR-0008)

- **MSW 2 en lugar de MSW 3:** la versión 3 es solo-ESM y Jest (modo CommonJS estable) no puede cargarla. Además, las dependencias `.mjs` de MSW 2 se transforman con Babel.
- Entorno `jest-fixed-jsdom` (jsdom con el `fetch` real de Node, que MSW necesita).
- 28 tests:
  - redirect seguro;
  - refresh transparente y compartido;
  - sesión expirada;
  - 403 sin refresh;
  - login en dos pasos;
  - transferencia con `Idempotency-Key`;
  - OTP rechazado;
  - inactividad;
  - **axe sin violaciones** en las pantallas de ingreso y transferencia.

## Pendiente o limitaciones

- React Router muestra avisos de _future flags_ de la v8; no se activan para no mezclar comportamientos de dos versiones mayores.
- **DOMPurify** está instalado, pero hoy ninguna pantalla renderiza HTML dinámico: React escapa todo el texto y el lint prohíbe `dangerouslySetInnerHTML`. Queda pendiente decidir si se elimina o se reserva para contenido HTML futuro.
