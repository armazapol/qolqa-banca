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

## Usuarios de demostración

Contraseña de ambos: `Qolqa#Demo2026`. El segundo factor es **TOTP real**: añade el secreto a Google Authenticator, Microsoft Authenticator o 1Password ("introducir clave manualmente").

| Usuario                      | Secreto TOTP                       |
| ---------------------------- | ---------------------------------- |
| `lucia.quispe@demo.qolqa.pe` | `FWSSOZW6G7NMMV4AQPTA6MEKI6S6RXBW` |
| `mateo.huaman@demo.qolqa.pe` | `SJRTFE2SVRBSY6Y3SKWJCN2D56PWE22L` |

> Estos secretos son públicos a propósito: pertenecen a datos ficticios de demostración.
