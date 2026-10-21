# ADR-0003: Shell React + microfrontend Angular con Module Federation y Web Component

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Contexto

La oferta pide React **y** Angular, Webpack **y** Vite, y Web Components. Queremos una vista en Angular integrada en una app React.

## Opciones consideradas

1. **Module Federation + Angular Elements (Web Component):**
   - el remote Angular se compila con Webpack y se expone como custom element;
   - el shell React (Vite) lo carga con `@module-federation/vite` (Module Federation 2.0);
   - cubre los tres requisitos a la vez;
   - riesgo: la interoperabilidad entre un host Vite y un remote Webpack.
2. **Native Federation** en ambos lados: más estable, pero sin Webpack.
3. **single-spa:** menos usado actualmente.

## Decisión

Opción 1. El shell es **React** (`apps/shell-react`) y el remote **"Inversiones"** es **Angular** (`apps/mf-investments`), expuesto como `<bank-investments>`.

El Web Component aísla los dos frameworks: React solo ve un elemento HTML estándar y no conoce Angular.

## Consecuencias

- **Plan B** si la interoperabilidad falla: Native Federation, o un shell con Rspack (compatible con Webpack). Se documentaría en un ADR nuevo.
- La ruta de inversiones solo se renderiza en el cliente, porque un custom element no se puede renderizar en el servidor (ver ADR-0004).
- El contrato entre el shell y el remote se define en el ADR-0010.
