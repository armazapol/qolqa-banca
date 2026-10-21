# ADR-0020: Microfrontend "Inversiones" con Native Federation

- **Estado:** Aceptado
- **Fecha:** 2026-10-21
- **Reemplaza:** la parte de "Module Federation con Webpack" del ADR-0003

## Contexto

El ADR-0003 preveía un remote Angular compilado con Webpack + Module Federation. Al implementarlo se comprobó que:

- **Angular declaró obsoleto todo su soporte de Webpack.** `@angular-devkit/build-angular` 22: _"Angular's Webpack support is deprecated. Use the esbuild and Vite-based @angular/build package instead."_
- **Nx 23 declaró obsoleto su Module Federation para Angular** (se elimina en Nx 24) y recomienda Native Federation.

Mantener el plan original significaba apostar por dos piezas obsoletas desde el primer día.

## Opciones consideradas

1. **Native Federation** (`@angular-architects/native-federation`): vía oficial para Angular con esbuild.
2. Seguir con Webpack + `@angular-architects/module-federation`: obsoleto.
3. Sin federación: Angular Elements en un bundle ES cargado con `import(url)`.

## Decisión

**Opción 1** (confirmada por el usuario).

| Pieza                | Elección                                                                                                 | Motivo                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Build del remote     | `@angular-architects/native-federation` 22 sobre `@angular/build` (esbuild)                              | Vía oficial y mantenida                                                                                                              |
| Carga en el shell    | `@softarc/native-federation-orchestrator` 4 (sin framework), importado bajo demanda                      | El host es React: necesita un runtime que no dependa de Angular                                                                      |
| Integración          | Angular Elements → `<bank-investments>`                                                                  | React solo ve un elemento HTML estándar                                                                                              |
| Detección de cambios | **Zoneless** + signals + `OnPush`                                                                        | Zone.js modifica `Promise`, `setTimeout` y `fetch` de toda la página y afectaría al shell React. Verificado: `window.Zone` no existe |
| Estilos              | **Shadow DOM** + tema de Angular Material dentro del componente                                          | Aislamiento total en ambas direcciones. Sin overlays de Material (diálogos, menús), que se renderizarían fuera del Shadow DOM        |
| Tema claro/oscuro    | `theme-type: color-scheme` (colores `light-dark()`)                                                      | El `color-scheme` que fija el shell en `<html>` se hereda a través del Shadow DOM: el modo oscuro funciona sin coordinación          |
| Precios              | `wss://data-stream.binance.vision` (miniTicker), RxJS `webSocket` con reintento exponencial (1 s → 30 s) | Endpoint de Binance solo para datos públicos de mercado. Los mensajes se validan antes de usarse                                     |
| Animaciones          | `animate.enter` nativo                                                                                   | `@angular/animations` está obsoleto desde Angular 20                                                                                 |

## Integración segura (ADR-0010)

- **Mismo origen:** el shell sirve el remote en `/mf/investments/*` (proxy de Vite en desarrollo; _rewrite_ de Vercel en producción).
  - Sin CORS.
  - La CSP podrá ser `script-src 'self'` (Fase 4).
  - El remote llama a `/api` como mismo origen.
- **Token:** el shell asigna `getAccessToken()` como **propiedad JS** (React 19 lo hace en custom elements). El remote lo invoca en cada petición y nunca lo guarda. Verificado en el navegador: el token no aparece en los atributos del DOM.
- **Eventos al shell:** `CustomEvent` con `bubbles` y `composed: true`, para atravesar el Shadow DOM.
  - El destino de `investments:navigate` se valida con `safeRedirect`: viene de otro bundle.
  - `investments:error` con `kind: 'auth'` cierra la sesión.
- **Resiliencia:** si el remote no carga, el shell muestra un aviso con "Reintentar" y el resto de la banca sigue funcionando.

## Problemas resueltos durante la implementación

| Problema                                                                                                                                                               | Solución                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Angular no soporta las _project references_ de TypeScript del monorepo                                                                                                 | Proyecto generado con `NX_IGNORE_UNSUPPORTED_TS_SETUP`, `composite`/`emitDeclarationOnly` desactivados solo aquí y un target `typecheck` propio (`tsc --noEmit` de app y tests) |
| El schematic de Native Federation (adaptador de workspace de Angular) escribió un `project.json` para **cada proyecto** (api, shell-react, shell-react-e2e, contracts) | Eliminados tras comprobar que eran duplicados exactos de la configuración en `package.json`: habrían creado dos fuentes de verdad                                               |
| La plantilla compartía todo el `package.json` raíz (incluidos React y NestJS)                                                                                          | `shared` explícito: solo Angular y RxJS                                                                                                                                         |
| `keepAll` publicaba los entrypoints de animaciones, que requieren `@angular/animations` (obsoleto)                                                                     | Esos entrypoints se excluyen (`skip`)                                                                                                                                           |
| `@qolqa/contracts` ocupaba **92 KB gzip** en el remote (todo Zod, sin tree-shaking)                                                                                    | El paquete declara `"sideEffects": false` y deja de compartirse como _mapping_. El módulo `Element` pasa a pesar **20 KB gzip**                                                 |
| Native Federation 22.2 requiere `@angular/build` ~22.2                                                                                                                 | Angular actualizado de 22.1 a 22.2 (rango soportado por Nx 23)                                                                                                                  |
| Sin Zone.js, `whenStable()` no esperaba la carga del portafolio                                                                                                        | La carga se registra con `PendingTasks` (API pública de Angular para apps zoneless)                                                                                             |

## Cobertura del requisito "Webpack"

El frontend ya no usa Webpack. El requisito lo cubre el **BFF**, compilado con Webpack (`apps/api/webpack.config.js`) y una configuración propia: _externals_ adaptados a pnpm y `mergeExternals`, con el bundle reducido a 180 KB.

## Consecuencias

- Se sigue la dirección oficial de Angular y Nx; no hay migración pendiente.
- Para un único remote, compartir Angular no aporta ahorro. Queda preparado para futuros remotes Angular (singletons con `strictVersion`).
- **Tests:**
  - 12 en el remote: cálculo, validación de mensajes de Binance, render en Shadow DOM, eventos `composed`;
  - 3 en el shell: contrato del host con un custom element falso;
  - recorrido real en Chromium con 11 comprobaciones.
