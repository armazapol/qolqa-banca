# ADR-0001: Proyecto "Qolqa Banca Digital" (mini banca por internet)

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Contexto

Necesitamos un proyecto acotado que demuestre todos los requisitos de una oferta de Frontend Senior en el sector financiero: React/Angular, seguridad, alta disponibilidad y regulación bancaria.

## Opciones consideradas

1. **A. Mini banca por internet:** login con 2FA, cuentas, movimientos, transferencias y tipo de cambio en tiempo real. Cubre ~100 % de los requisitos.
2. **B. Plataforma de inversiones/trading:** muy fuerte en tiempo real, más débil en seguridad y regulación (~85 %).
3. **C. Portal de solicitud de crédito (KYC):** fuerte en formularios, débil en tiempo real (~75 %).

## Decisión

Opción **A**. Es el dominio más representativo de una "aplicación crítica de alta disponibilidad" y obliga a resolver autenticación, tokens, CSRF, CSP, validación y accesibilidad en formularios. Alcance: unas 5-6 pantallas más un microfrontend.

La marca es ficticia: **Qolqa**. En quechua, las qolqas eran los almacenes incas donde se guardaban los excedentes, una metáfora de guardar valor. No imita a ningún banco real.

## Consecuencias

- Todos los datos son simulados: el proyecto no maneja dinero ni datos reales.
- Los controles regulatorios son una aproximación demostrativa (ver ADR-0011), no un cumplimiento legal.
