# ADR-0007: Librerías de UI y estilos

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Contexto

La oferta pide Material UI, Tailwind CSS y SASS o LESS.

## Decisión

- **React:**
  - **MUI** para los componentes complejos y accesibles: tabla de movimientos, date pickers y diálogos.
  - **Tailwind** para el layout y las utilidades.
  - Ambos se ordenan con CSS cascade layers (`@layer`) para evitar conflictos de especificidad: así las utilidades de Tailwind sobrescriben a MUI de forma predecible.
- **Angular:** **Angular Material + SCSS** (SASS) en el microfrontend.
- **Tokens de diseño compartidos** en `packages/ui-tokens`, como variables CSS, para que ambos frameworks usen la misma paleta.

## Consecuencias

El shell tiene dos sistemas de estilos. La convención es usar MUI para componentes y Tailwind para la composición, y no escribir CSS ad hoc salvo casos justificados.
