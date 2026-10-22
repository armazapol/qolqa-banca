# Qolqa Banca Digital

Mini banca por internet ficticia (Perú): un proyecto de portafolio Frontend Senior para el sector financiero.

> Proyecto demostrativo. Banco ficticio, datos simulados.

## Stack

- **Monorepo:** Nx + pnpm
- **Shell:** React + Vite + React Router v7, con Redux Toolkit, TanStack Query, MUI y Tailwind
- **Microfrontend "Inversiones":** Angular 22 (zoneless) + Angular Material + SCSS, expuesto como Web Component con Native Federation
- **BFF:** NestJS (REST + GraphQL + WebSocket), Prisma y PostgreSQL (Neon)
- **Calidad:** Jest, Testing Library, Playwright, ESLint, Prettier, Husky y commitlint
- **Infraestructura:** GitHub Actions, Vercel, Render, GA4 y Sentry

## Despliegue

| Pieza           | Dónde                                |
| --------------- | ------------------------------------ |
| Banca web (SSR) | https://qolqa-banca.vercel.app       |
| Remote Angular  | https://qolqa-inversiones.vercel.app |
| BFF             | Render (US East), detrás de `/api`   |
| Base de datos   | Neon PostgreSQL 17 (US East)         |

Solo despliega GitHub Actions y solo si pasan la calidad y los E2E. Cada PR recibe un preview y `main` va a producción (ADR-0023). La primera petición tras un rato sin uso puede tardar unos segundos mientras Render despierta el servidor. Los datos de demostración se restablecen cada día a las 05:00 (hora de Lima).

## Documentación

- [Requisitos → herramientas → ubicación](docs/REQUISITOS.md)
- [Decisiones de arquitectura (ADR)](docs/adr/)

## Ejecutar en local

Requisitos: Node 24, pnpm 11 y Docker.

```bash
pnpm install
docker compose up -d --wait            # PostgreSQL 17 en 127.0.0.1:5434
cp apps/api/.env.example apps/api/.env # rellena los secretos (base64 de 32 bytes)
pnpm nx run api:db-migrate             # aplica las migraciones
pnpm nx run api:db-seed                # crea los usuarios de demo
pnpm nx serve api                      # BFF en http://localhost:3000/api
pnpm nx serve mf-investments           # microfrontend Angular en http://localhost:4201
pnpm nx dev shell-react                # banca web en http://localhost:5173 (incluye /mf/investments)
```

Para generar un secreto: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

Si cambias un endpoint REST o el esquema GraphQL del BFF, regenera el contrato con `pnpm nx run api:openapi`; el front vuelve a generar sus clientes tipados automáticamente.

| Recurso                       | URL                                   |
| ----------------------------- | ------------------------------------- |
| Banca web                     | http://localhost:5173                 |
| Swagger (REST)                | http://localhost:3000/api/docs        |
| GraphQL (Apollo Sandbox)      | http://localhost:3000/api/graphql     |
| Health check                  | http://localhost:3000/api/health      |
| Tipo de cambio oficial (BCRP) | http://localhost:3000/api/fx/official |

## Pruebas

```bash
pnpm nx run-many -t lint typecheck test   # ESLint, TypeScript y Jest en todo el monorepo
pnpm nx e2e shell-react-e2e               # Playwright: requiere Docker (PostgreSQL) y openssl
```

La batería E2E crea la base `qolqa_e2e` (no toca la de desarrollo), compila los builds de producción y los sirve detrás de un proxy HTTPS en `https://localhost:4300` que imita a Vercel. Corre en Chromium, Firefox, WebKit y Pixel 7 (ADR-0022). La primera vez instala los navegadores con `pnpm exec playwright install`. Para repetirla sin recompilar: `E2E_SKIP_BUILD=1 pnpm nx e2e shell-react-e2e`.

## Variables de entorno opcionales

GA4 y Sentry se activan solo si se configuran; sin ellas la app funciona igual (ADR-0021).

| Variable                 | Proyecto      | Para qué                                    |
| ------------------------ | ------------- | ------------------------------------------- |
| `VITE_GA_MEASUREMENT_ID` | shell (build) | Google Analytics 4, solo con consentimiento |
| `VITE_SENTRY_DSN`        | shell (build) | Errores del navegador y del SSR             |
| `VITE_WS_URL`            | shell (build) | Origen del BFF para WebSocket               |
| `SENTRY_DSN`             | BFF           | Errores del servidor                        |
| `WEB_ORIGIN_PREVIEW`     | BFF           | Dominios de preview admitidos (un solo `*`) |

Ejemplos en `apps/shell-react/.env.example` y `apps/api/.env.example`.

## Usuarios de demostración

Contraseña de ambos: `Qolqa#Demo2026`. El segundo factor es **TOTP real**: añade el secreto a Google Authenticator, Microsoft Authenticator o 1Password ("introducir clave manualmente").

| Usuario                      | Secreto TOTP                       |
| ---------------------------- | ---------------------------------- |
| `lucia.quispe@demo.qolqa.pe` | `FWSSOZW6G7NMMV4AQPTA6MEKI6S6RXBW` |
| `mateo.huaman@demo.qolqa.pe` | `SJRTFE2SVRBSY6Y3SKWJCN2D56PWE22L` |

> Estos secretos son públicos a propósito: pertenecen a datos ficticios de demostración.
