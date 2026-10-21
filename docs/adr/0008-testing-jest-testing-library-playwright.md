# ADR-0008: Estrategia de testing

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Contexto

La oferta pide Jest y Testing Library. Con Vite lo natural sería Vitest, pero se prioriza el requisito de la oferta.

## Decisión

- **Tests unitarios y de integración:**
  - **Jest + Testing Library** en React;
  - Jest con `jest-preset-angular` en Angular;
  - Jest en NestJS.
- **Mocks de red:** **MSW**. Intercepta a nivel de red, así que los mismos handlers sirven para los tests y para el desarrollo.
- **Accesibilidad:** `jest-axe` en los componentes.
- **E2E:** **Playwright** para los flujos login → transferencia y carga del microfrontend, con `@axe-core/playwright` para revisar WCAG 2.2 AA.
- **Storybook:** descartado para mantener el alcance acotado.

## Consecuencias

Jest no usa el pipeline de Vite: el código se transforma con SWC o ts-jest. Nx lo configura.
