# ADR-0010: Contrato entre el shell React y el microfrontend Angular

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Contexto

El remote necesita llamar al BFF autenticado (portafolio por GraphQL) sin debilitar la protección de tokens del ADR-0009.

## Opciones consideradas

1. Compartir el token por `localStorage`: vulnerable a XSS. **Descartada.**
2. Pasar el token como atributo HTML: queda visible en el DOM. **Descartada.**
3. **Pasar una función `getAccessToken()` como propiedad JS del custom element.**

## Decisión

Opción 3.

- **Shell → remote:** propiedades del elemento (`getAccessToken`, `apiBaseUrl`, `locale`).
- **Remote → shell:** `CustomEvent` (`investments:navigate`, `investments:error`, `investments:analytics`).

El shell sigue siendo el único dueño de la sesión y el remote no guarda nada.

## Dónde se aplica

Los tipos del contrato están en `packages/contracts` y los usan ambos frameworks.
