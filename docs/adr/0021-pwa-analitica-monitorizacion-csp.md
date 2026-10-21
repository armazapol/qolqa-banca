# ADR-0021: PWA, analítica, monitorización y Content Security Policy

- **Estado:** Aceptado
- **Fecha:** 2026-10-21
- **Amplía:** ADR-0014 (analítica y monitorización) y ADR-0009 (seguridad)

## Decisiones confirmadas

| #   | Tema              | Decisión                                                                                                                                                                                                                                 |
| --- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Alcance de la PWA | Instalable. Las páginas públicas funcionan sin conexión. **`/app`, `/ingresar` y `/api` nunca se guardan en el dispositivo**                                                                                                             |
| 2   | Actualizaciones   | Aviso "Nueva versión disponible · Actualizar"; nunca se recarga sola (no se interrumpe una transferencia)                                                                                                                                |
| 3   | Consentimiento    | Banner propio (MUI + Redux), Consent Mode v2 **básico**: gtag.js no se descarga sin aceptar. "Rechazar" con el mismo peso que "Aceptar". La decisión dura 12 meses y se puede cambiar en `/legal/cookies`                                |
| 4   | GA4               | `gtag.js` directo, sin Google Tag Manager. Publicidad denegada y Google Signals desactivado                                                                                                                                              |
| 5   | Eventos           | `page_view` con la **ruta** (`/app/movimientos/:accountId`, sin identificadores ni query string), `web_vitals` (LCP, INP, CLS), `login`, `transfer_completed` (solo la moneda) e `investments_view`. **Ningún importe ni dato personal** |
| 6   | Sentry            | Shell (navegador y SSR) y BFF; trazas al 10 %; **Session Replay desactivado**                                                                                                                                                            |
| 7   | CSP               | Sin `'unsafe-inline'` ni `'unsafe-eval'` para scripts: **nonce** por petición en SSR y **hashes SHA-256** en las páginas prerenderizadas                                                                                                 |

Todo se configura con variables de entorno. Sin ellas, GA4 y Sentry quedan desactivados sin errores.

## CSP: diseño

| Documento                                      | Mecanismo                                                                                                                                    | Dónde                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| SSR (`/ingresar`, `/tipo-de-cambio`, `/app/*`) | Nonce aleatorio de 128 bits por petición, en la cabecera y en cada script inline (`<Scripts>`, `<ScrollRestoration>`, script de tema de MUI) | `apps/shell-react/app/entry.server.tsx`  |
| Prerenderizado (`/`, `/seguridad`, `/legal/*`) | Hashes de cada script inline, calculados tras el build en `build/csp-static.json`; en la Fase 6 se enviarán como cabecera por ruta           | `apps/shell-react/scripts/csp-static.ts` |

La política, compartida en `app/lib/csp/policy.ts`, incluye:

- `frame-ancestors 'none'` (antisecuestro de clics), `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` y `upgrade-insecure-requests`.
- `connect-src` limitado al propio origen, el WebSocket del BFF, Binance y, solo si están configurados, Sentry y Google Analytics.
- `style-src 'unsafe-inline'`: MUI (Emotion) y Angular inyectan `<style>` en tiempo de ejecución. Es un riesgo mucho menor que en scripts y se acepta.

### Frontera de seguridad al entrar a la banca

El orquestador de Native Federation genera el _import map_ en tiempo de ejecución; un hash no puede autorizarlo. Por eso **"Ingresar" abre un documento nuevo** (`reloadDocument`): la zona privada siempre corre bajo la CSP con nonce. El nonce del documento se lee de la propiedad `.nonce` de un script existente: el navegador lo oculta del atributo HTML.

> **Actualizado por ADR-0022:** el _import map_ se carga con es-module-shims (_shim mode_) para que funcione en Firefox, y la CSP del área privada (`/ingresar`, `/app/*`) permite `script-src blob:`. Las páginas públicas no cambian.

## Problemas encontrados durante la verificación

Recorrido real en Chromium con el build de producción, un proxy que imita el _edge_ de Vercel y el registro de `securitypolicyviolation`. Resultado final: **0 violaciones**.

| Problema                                                                                                                                                                              | Solución                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sentry 11 sustituyó `sendDefaultPii` por `dataCollection`** y por defecto recoge cuerpos HTTP, cookies, cabeceras, variables de GraphQL, datos de consultas SQL y variables locales | Recolección restrictiva por lista blanca en el BFF y en el shell, más una segunda limpieza en `beforeSend` (`redactSensitive` de los contratos: JWT, Bearer, correos, cuentas, tarjetas, DNI)                     |
| **Zod 4 prueba `Function('')`** (su modo JIT): la CSP lo bloqueaba en cada visita                                                                                                     | `z.config({ jitless: true })` como **primer import de `root.tsx`**: React Router evalúa los módulos de ruta antes que `entry.client`, y algunos esquemas (`.omit`, `.keyof`) activan la comprobación al evaluarse |
| El import con efectos de la configuración de Zod desaparecía del bundle                                                                                                               | El shell declara `"sideEffects": false`: ese archivo se lista como excepción en `package.json`                                                                                                                    |
| `@vite-pwa/remix` solo funciona con Remix, no con React Router 7                                                                                                                      | `vite-plugin-pwa` 2 directamente; genera el _service worker_ solo en el build del cliente                                                                                                                         |
| La precache inicial incluía toda la app (92 archivos, 1,7 MB)                                                                                                                         | Precache mínima (CSS, fuentes, iconos: 254 KB). Los JS con hash se guardan al usarse (CacheFirst)                                                                                                                 |
| El HTML prerenderizado se genera después del build del cliente y no puede precachearse                                                                                                | Páginas públicas con NetworkFirst y página "sin conexión" generada por el propio _service worker_                                                                                                                 |
| Jest no admite `import.meta.env`                                                                                                                                                      | `babel-plugin-transform-vite-meta-env` en la configuración de Jest                                                                                                                                                |

## Sentry con microfrontend

Una sola instancia de Sentry en la página, la del shell. El `ErrorHandler` de Angular (`ShellErrorHandler`) emite los errores no controlados como `investments:error` con su _stack_, y el shell los reporta con la etiqueta `microfrontend: mf-investments`. Así se evitan dos SDK compitiendo por los mismos manejadores globales.

## Variables de entorno

| Variable                                     | Dónde           | Uso                                                   |
| -------------------------------------------- | --------------- | ----------------------------------------------------- |
| `VITE_GA_MEASUREMENT_ID`                     | Build del shell | GA4 (`G-XXXXXXX`)                                     |
| `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT` | Build del shell | Sentry en navegador y SSR                             |
| `VITE_WS_URL`                                | Build del shell | Origen del BFF para WebSocket (también lo usa la CSP) |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT`           | BFF             | Sentry en NestJS                                      |
