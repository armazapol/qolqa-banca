# ADR-0012: Hosting y despliegue

- **Estado:** Aceptado (el modo de renderizado está en el ADR-0004)
- **Repositorio:** `qolqa-banca`, público en GitHub
- **Fecha:** 2026-10-21

## Decisión

- **Vercel** (plan Hobby, gratuito): shell React y remote Angular estático (dos proyectos).
- **Microfrontend bajo el mismo origen:** un rewrite en el proyecto del shell envía `/mf/investments/*` al proyecto del remote (ADR-0020). Así no hace falta CORS y la CSP puede limitar los scripts a `'self'`.
- **Render** (plan gratuito): BFF NestJS. Se duerme tras unos 15 min sin uso y tarda unos 50 s en despertar; es aceptable para una demo.
- **Mismo origen:** un rewrite en Vercel envía `/api/*` a Render.
  - Así la cookie del refresh token es de primera parte (Safari y Chrome bloquean las cookies de terceros) y puede usar `SameSite=Strict`.
- **WebSocket:** Vercel no reenvía WebSockets, así que el cliente se conecta directamente a Render.
  - Usa un **ticket de un solo uso y vida corta** que emite `/api/ws-ticket` (autenticado).
  - Así el access token no aparece en la URL de conexión.

- **El despliegue lo controla GitHub Actions**, no la integración automática de Vercel o Render.
  - Solo se despliega a producción si pasan lint, typecheck, tests, E2E y Lighthouse.
  - Vercel se invoca con su CLI (`vercel deploy --prebuilt`) y Render mediante un deploy hook.
  - Así una rama rota nunca llega a producción y todo el proceso queda en un único pipeline revisable.

## Consecuencias

- Se desactiva el despliegue automático por Git en Vercel y Render, y los tokens viven en GitHub Secrets.
- El CORS del BFF solo admite el origen de Vercel, y solo hace falta para el WebSocket: las peticiones REST y GraphQL llegan como mismo origen gracias al rewrite.
