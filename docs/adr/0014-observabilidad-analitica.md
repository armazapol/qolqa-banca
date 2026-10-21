# ADR-0014: Analítica, rendimiento y monitorización de errores

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Decisión

- **GA4** con **Consent Mode v2:**
  - no se cargan cookies de analítica hasta que el usuario acepta;
  - los eventos no llevan datos personales ni importes.
- **Core Web Vitals:**
  - la librería `web-vitals` envía LCP, INP y CLS a GA4;
  - **Lighthouse CI** se ejecuta en el pipeline con presupuestos de rendimiento.
- **Sentry:**
  - errores y trazas del shell, del remote y del BFF;
  - los source maps se suben desde el CI;
  - `beforeSend` filtra tokens, cabeceras y datos de cuenta.

## Consecuencias

Requiere el ID de medición de GA4 y los DSN de Sentry como variables de entorno o secretos, nunca dentro del repositorio.
