# ADR-0002: Monorepo con Nx y pnpm

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Contexto

Conviven tres aplicaciones (shell React, microfrontend Angular y BFF NestJS) y paquetes compartidos (contratos/tipos y tokens de diseño). Necesitamos builds incrementales, caché y un CI que solo ejecute lo afectado.

## Opciones consideradas

1. **Nx:** soporte oficial para React, Angular, NestJS y Module Federation; generadores; `nx affected`; reglas de límites entre módulos.
2. **pnpm workspaces + Turborepo:** más ligero, pero sin generadores ni soporte nativo de Angular o Module Federation.

## Decisión

**Nx 23** con **pnpm 11** como gestor de paquetes.

- Ventajas de pnpm:
  - instalación rápida;
  - `node_modules` estricto, que evita dependencias fantasma;
  - desde la v11, bloquea los scripts de instalación salvo los aprobados explícitamente (`allowBuilds` en `pnpm-workspace.yaml`), lo que reduce el riesgo de ataques a la cadena de suministro. Hoy solo están aprobados `nx` y `@swc/core`.
- Estructura: `apps/*` para las aplicaciones desplegables y `packages/*` para el código compartido.

## Consecuencias

- El CI usará `nx affected` para no reconstruir lo que no cambió (el ADR de CI/CD está pendiente).
- No se usa Nx Cloud (servicio de pago fuera de alcance). La caché es local y de GitHub Actions.
- La plantilla de Nx 23 genera configuraciones para varios agentes de IA (Cursor, Codex, Gemini y OpenCode), un plugin de Claude de un marketplace externo y un workflow de CI basado en Nx Cloud y npm. **Se excluyeron** del repositorio porque no aportan al proyecto y para no introducir configuración de terceros sin revisar.

## Dónde se aplica

`nx.json`, `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json` y `eslint.config.mjs` (regla `@nx/enforce-module-boundaries`).
