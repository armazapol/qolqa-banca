# Qolqa Banca Digital

Mini banca por internet ficticia (Perú): un proyecto de portafolio Frontend Senior para el sector financiero.

> Proyecto demostrativo. Banco ficticio, datos simulados.

## Stack

- **Monorepo:** Nx + pnpm
- **Shell:** React + Vite + React Router v7, con Redux Toolkit, TanStack Query, MUI y Tailwind
- **Microfrontend "Inversiones":** Angular + Angular Material + SCSS, expuesto como Web Component con Module Federation
- **BFF:** NestJS (REST + GraphQL + WebSocket), Prisma y PostgreSQL (Neon)
- **Calidad:** Jest, Testing Library, Playwright, ESLint, Prettier, Husky y commitlint
- **Infraestructura:** GitHub Actions, Vercel, Render, GA4 y Sentry

## Documentación

- [Requisitos → herramientas → ubicación](docs/REQUISITOS.md)
- [Decisiones de arquitectura (ADR)](docs/adr/)

## Requisitos locales

- Node 24, pnpm 11

```bash
pnpm install
```
