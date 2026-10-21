# ADR-0015: Interfaz solo en español

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Decisión

La interfaz está únicamente en **español (es-PE)**, sin librería de i18n. Los formatos de moneda y fecha usan `Intl.NumberFormat` e `Intl.DateTimeFormat` con `es-PE` (PEN/USD).

## Consecuencias

Menos dependencias. Añadir i18n más adelante implicaría extraer los textos.
