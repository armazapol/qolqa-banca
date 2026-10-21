# ADR-0011: Controles inspirados en la regulación peruana

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Contexto

La oferta pide conocimiento de regulación bancaria. El proyecto toma como referencia **Perú**:

- **SBS:** Reglamento de Tarjetas (autenticación reforzada en operaciones) y Reglamento de Seguridad de la Información y Ciberseguridad.
- **Ley 29733** de Protección de Datos Personales y su reglamento.

> Es una aproximación demostrativa y **no** constituye cumplimiento legal.

## Decisión: controles implementados

| Control                        | Implementación                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Autenticación reforzada        | TOTP en el login y en cada transferencia (ADR-0009)                                                     |
| Sesión segura                  | Cierre por inactividad con aviso previo y access token de vida corta                                    |
| Protección de datos de tarjeta | Enmascarado: primeros 6 y últimos 4 dígitos (alineado con PCI DSS)                                      |
| Protección de datos de cuenta  | Número de cuenta parcialmente oculto, con opción de mostrarlo                                           |
| Límites operativos             | Límite diario de transferencia: el front lo valida para la UX y el BFF es quien decide                  |
| Notificación de operaciones    | Aviso en tiempo real por WebSocket tras cada transferencia                                              |
| Trazabilidad                   | Registro de auditoría de logins, transferencias y fallos de OTP                                         |
| Consentimiento (Ley 29733)     | Banner de cookies: la analítica no se carga sin consentimiento y los eventos no llevan datos personales |
