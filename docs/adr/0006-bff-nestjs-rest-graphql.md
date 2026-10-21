# ADR-0006: BFF propio en NestJS con REST y GraphQL

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Contexto

Para demostrar seguridad real (cookies httpOnly, CSRF, CSP, CORS y rotación de tokens) hace falta un servidor propio. La oferta pide REST y/o GraphQL.

## Opciones consideradas

1. **BFF en NestJS:** TypeScript de punta a punta y soporte oficial para REST, GraphQL y WebSockets.
2. **Solo APIs públicas + MSW:** no permite demostrar las cookies ni las cabeceras de seguridad.
3. **json-server:** sin autenticación ni WebSockets reales.

## Decisión

**NestJS** en `apps/api`:

- **REST**, documentado con OpenAPI/Swagger: `/auth`, `/transfers` y `/fx`, es decir, las operaciones que modifican datos o son sensibles.
- **GraphQL** (Apollo, code-first): consultas de cuentas, movimientos y portafolio, donde la UI elige los campos que necesita.
- **WebSocket:** tipo de cambio y notificaciones de operaciones.
- APIs públicas consumidas, ninguna requiere API key:
  - ~~**Frankfurter**~~ → **BCRP**: tipos de cambio (ver ADR-0017; Frankfurter no publica PEN);
  - **Binance WebSocket**: precios.

## Consecuencias

- El frontend genera clientes tipados con **Orval** (OpenAPI → hooks de TanStack Query) y **GraphQL Codegen**.
- Los esquemas Zod compartidos viven en `packages/contracts`.
