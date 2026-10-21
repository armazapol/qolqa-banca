# ADR-0016: Calidad de código y convenciones

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Decisión

- **ESLint 9** (flat config) con `@nx/eslint-plugin` y `typescript-eslint`.
  - La regla `@nx/enforce-module-boundaries` impide dependencias no permitidas entre proyectos.
  - Se mantiene ESLint 9, la versión que fija Nx 23, en lugar de ESLint 10, para evitar incompatibilidades con los plugins de Nx.
- **Prettier** para el formato.
- **Husky + lint-staged:** en cada commit se aplican lint y formato solo a los archivos modificados.
- **commitlint** con _Conventional Commits_ (`feat:`, `fix:`, `docs:`, etc.), lo que permite generar changelogs.

## Dónde se aplica

`eslint.config.mjs`, `.prettierrc`, `.husky/`, `.lintstagedrc.mjs` y `commitlint.config.mjs`.
