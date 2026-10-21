# ADR-0017: Tipo de cambio desde el BCRP con cotización simulada en tiempo real

- **Estado:** Aceptado
- **Fecha:** 2026-10-21
- **Reemplaza:** el uso de Frankfurter previsto en el ADR-0006

## Contexto

El ADR-0006 proponía Frankfurter para los tipos de cambio. Al verificarlo, **Frankfurter no publica el sol peruano (PEN)**: usa las tasas de referencia del BCE, que no lo incluyen.

## Opciones consideradas

1. **API del BCRP** (Banco Central de Reserva del Perú): fuente oficial y sin API key. Publica un dato por día hábil; los días sin dato aparecen como `n.d.`.
2. **open.er-api.com** (ExchangeRate-API): incluye PEN y no requiere key, pero exige atribución y no es una fuente oficial peruana.

## Decisión

**BCRP**, con las series `PD04639PD` (compra) y `PD04640PD` (venta), "TC Sistema bancario SBS (S/ por US$)". Ambas se piden en una sola llamada.

- El BFF consulta los últimos 45 días al arrancar y luego cada hora (`@nestjs/schedule`), y usa el último día con dato.
- La respuesta externa se **valida con Zod**: una API de terceros nunca es de confianza.
- **Degradación controlada:** si el BCRP no responde, se mantiene el último dato conocido; si nunca hubo dato, se responde 503 sin afectar al resto del BFF.
- **Cotización del banco simulada:**
  - compra = oficial − 0,02 y venta = oficial + 0,02;
  - más una oscilación aleatoria acotada a ±0,01;
  - se emite cada 3 s por Socket.IO (namespace `/fx`);
  - siempre va marcada como `simulated: true` y la UI la etiqueta como "referencial simulado".

## Consecuencias

- Fuente coherente con el enfoque regulatorio peruano (ADR-0011).
- El "tiempo real" del tipo de cambio es simulado; el tiempo real con datos reales lo aporta Binance en el microfrontend de Inversiones.

## Dónde se aplica

`apps/api/src/fx/` (`bcrp.client.ts`, `fx.service.ts`, `fx.controller.ts`, `fx.gateway.ts`) y `packages/contracts/src/lib/fx.ts`.
