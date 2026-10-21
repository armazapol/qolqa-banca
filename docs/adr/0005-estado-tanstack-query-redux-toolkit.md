# ADR-0005: Gestión de estado con TanStack Query + Redux Toolkit

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Contexto

Hay dos tipos de estado distintos:

- **Estado del servidor** (cuentas, movimientos, portafolio): es asíncrono, se puede cachear y puede quedar obsoleto.
- **Estado del cliente** (sesión, temporizador de inactividad, consentimiento de cookies, preferencias de UI): es síncrono y propio de la app.

Además, la oferta pide explícitamente patrones Flux/Redux.

## Opciones consideradas

1. **TanStack Query + Redux Toolkit:** cada herramienta para lo que mejor hace.
2. **Solo RTK Query:** todo dentro de Redux, pero con menos ecosistema (por ejemplo, Orval genera hooks de TanStack Query).

## Decisión

Opción 1.

- **TanStack Query:**
  - caché y reintentos;
  - invalidación tras una transferencia;
  - `refetchOnWindowFocus` para mantener los saldos al día;
  - elimina el código manual de loading y error.
- **Redux Toolkit:** flujo unidireccional Flux (acción → reducer → store), DevTools y slices tipados.

**Regla:** los datos del servidor nunca se copian a Redux.

## Dónde se aplica

Redux en `apps/shell-react/src/app/store/` y TanStack Query en `apps/shell-react/src/features/*/api/`. Las rutas exactas se completarán en `docs/REQUISITOS.md`.
