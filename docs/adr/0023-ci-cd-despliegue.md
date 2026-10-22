# ADR-0023: CI/CD y despliegue (GitHub Actions, Vercel, Render, Neon)

- **Estado:** Aceptado
- **Fecha:** 2026-10-21
- **Concreta:** ADR-0012 (hosting) y ADR-0013 (base de datos)

## Decisiones confirmadas

| #   | Tema                 | Decisión                                                                                                                                                                                     |
| --- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CI                   | **GitHub Actions**: formato, lint, typecheck, tests y build (`nx affected`) + E2E completos con PostgreSQL como servicio                                                                     |
| 2   | Cuándo se despliega  | **Solo desde Actions y solo si la CI pasa**. Sin integraciones Git automáticas de Vercel ni Render. Cada PR recibe un preview                                                                |
| 3   | Remote Angular       | **Proyecto propio en Vercel** (`qolqa-inversiones`): se despliega de forma independiente; el shell lo sirve bajo su origen con un rewrite                                                    |
| 4   | Arranque en frío     | Keep-alive con cron de Actions **y** aviso "Despertando el servidor…" en la app                                                                                                              |
| 5   | Datos de la demo     | Migraciones desde Actions antes de desplegar el BFF; **reseteo diario** del seed a las 05:00 de Lima                                                                                         |
| 6   | Dominios             | Gratuitos: `qolqa-banca.vercel.app`, `qolqa-inversiones.vercel.app`, `qolqa-api-rccn.onrender.com`                                                                                           |
| 7   | Lighthouse CI        | Gratuito (`treosh/lighthouse-ci-action`), con los umbrales "good" de Google: LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms y accesibilidad ≥ 95                                                       |
| 8   | Protección de `main` | Ruleset: PR obligatorio con los checks de CI en verde, historial lineal, sin force-push ni borrado. 0 aprobaciones (un solo autor)                                                           |
| 9   | Región               | **US East (Virginia)** para todo: Neon `aws-us-east-1`, Render `virginia`, funciones de Vercel `iad1`. Render no tiene región en Sudamérica; lo que más pesa es tener el BFF junto a la base |
| 10  | Health checks        | `/api/health/live` (sin base de datos) para Render y el keep-alive; `/api/health` (con base) solo para verificar despliegues                                                                 |
| 11  | Previews             | Usan el BFF y la base de producción (no caben un BFF y una base por PR en el plan gratuito). El CORS del BFF admite también los dominios de preview del proyecto                             |
| 12  | BFF en Render        | Blueprint (`render.yaml`) con auto-deploy desactivado; Actions despliega por API **el commit exacto** que pasó la CI. Render genera los secretos (`generateValue`)                           |

## Flujo

```text
PR   ─▶ quality ─┐
         e2e ────┴▶ preview: remote (Vercel) → shell (Vercel, usa el remote del PR) → Lighthouse (presupuestos)
main ─▶ quality ─┐
         e2e ────┴▶ production: prisma migrate deploy (Neon, conexión directa)
                                → BFF en Render (API, commit exacto) → GET /api/health
                                → remote → shell → Lighthouse (informe público temporal)
cron ─▶ keep-alive (*/14 min) · reseteo de la demo (10:00 UTC)
```

| Pieza                   | Dónde                                                                            | Detalle                                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pipeline                | `.github/workflows/ci-cd.yml`                                                    | Un solo flujo: ningún despliegue puede saltarse la CI. En `main` los despliegues no se cancelan entre sí (`concurrency`)                                           |
| Preparación común       | `.github/actions/setup/action.yml`                                               | Node desde `.node-version` y pnpm desde `packageManager` (ahora fijados en el repo), con caché                                                                     |
| Shell en Vercel         | `apps/shell-react/vercel.json`                                                   | `vercel build` con el preset oficial `@vercel/react-router`, que solo se activa con `VERCEL=1`: el build local y la batería E2E siguen con `react-router-serve`    |
| Rewrites y CSP estática | `apps/shell-react/scripts/vercel-output.ts`                                      | Completa `.vercel/output/config.json`: `/api/*` → Render, `/mf/investments/*` → remote, y la CSP por hashes + cabeceras de seguridad de cada página prerenderizada |
| Remote en Vercel        | `apps/mf-investments/scripts/vercel-output.mjs`                                  | Build Output API v3: `remoteEntry.json` siempre se revalida (un despliegue del remote llega sin redesplegar el shell); los `.js` con hash, caché inmutable         |
| BFF en Render           | `render.yaml`, `tools/deploy/render-deploy.mjs`                                  | Despliegue por API y espera hasta `live`; luego `GET /api/health` con reintentos                                                                                   |
| Keep-alive              | `.github/workflows/keep-alive.yml`                                               | `/api/health/live` cada 14 min                                                                                                                                     |
| Reseteo de la demo      | `.github/workflows/demo-reset.yml`                                               | Seed contra Neon; comparte `concurrency` con el despliegue para no coincidir con una migración                                                                     |
| Aviso de arranque       | `apps/shell-react/app/lib/api/server-wake.ts`, `components/ServerWakeNotice.tsx` | Si una petición supera 4 s, aviso `role="status"` hasta que responda                                                                                               |
| CORS de previews        | `apps/api/src/common/security/origins.ts`                                        | `WEB_ORIGIN_PREVIEW` con un único `*` que solo admite `[a-z0-9-]`: no puede coincidir con otro dominio                                                             |
| Source maps             | `vite.config.mts`, `react-router.config.ts`, `apps/api/webpack.config.js`        | Solo con `SENTRY_AUTH_TOKEN`. En el shell se generan como `hidden` y se **borran tras subirlos**: no se publican. Release = commit                                 |

## Neon y el plan gratuito

Neon suspende el cómputo tras 5 minutos sin actividad y el plan gratuito limita las horas de cómputo al mes. Si algo consultara la base periódicamente, nunca se suspendería y las horas se agotarían a mitad de mes. Por eso:

- El health check de Render y el keep-alive usan `/api/health/live`, que no consulta la base.
- El pool de `pg` cierra las conexiones inactivas a los 10 s (valor por defecto).
- El BFF no tiene tareas periódicas que consulten la base: el tipo de cambio vive en memoria.

Las migraciones usan la cadena **directa** (PgBouncer no admite las sentencias de migración) y el BFF, la **pooled**.

## Previews protegidos y Lighthouse

- Los previews del shell mantienen la **protección de Vercel** que viene por defecto: usan datos de producción y solo debe verlos el dueño de la cuenta. Lighthouse entra con el secreto _Protection Bypass for Automation_ (`VERCEL_AUTOMATION_BYPASS_SECRET`).
- Lighthouse guarda las cabeceras enviadas dentro del informe. Por eso, en los previews solo se comprueban los presupuestos y **no se publica el informe**. El informe público temporal (7 días) se genera solo para producción, que no necesita el secreto.
- El remote no tiene protección: son archivos estáticos sin datos, y así el preview del shell puede cargar el remote de su mismo PR.

## Riesgos aceptados

- **Previews contra producción:** un PR podría modificar datos reales de la demo. Los previews están protegidos y el reseteo diario restaura el estado.
- **Cron de GitHub no puntual:** puede retrasarse minutos, así que habrá algún arranque en frío. GitHub también desactiva los cron tras 60 días sin actividad en el repositorio.
- **`TRUST_PROXY=2`** (cliente → Vercel → proxy de Render): se verificará en el primer despliegue que `req.ip` sea la IP del cliente, porque de ello depende el límite de intentos de login.

## Dónde se aplica

`.github/`, `render.yaml`, `lighthouserc.json`, `tools/deploy/`, `.node-version`, `package.json` (`packageManager`, `engines`), `apps/shell-react/{vercel.json,react-router.config.ts,vite.config.mts,scripts/vercel-output.ts}`, `apps/shell-react/app/lib/api/server-wake.ts`, `apps/mf-investments/scripts/vercel-output.mjs`, `apps/api/src/{health,common/security/origins.ts,config/env.ts,main.ts}`, `apps/api/webpack.config.js`.
