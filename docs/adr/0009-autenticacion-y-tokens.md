# ADR-0009: Autenticación, manejo de tokens y CSRF

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Contexto

Una banca por internet es objetivo de robo de sesión. Hay que minimizar el impacto de un XSS y prevenir CSRF.

## Decisión

- **Access token JWT de vida corta (5 min), guardado solo en memoria**, nunca en `localStorage` ni `sessionStorage`. Un XSS no puede leerlo del almacenamiento y desaparece al cerrar la pestaña.
- **Refresh token en una cookie `httpOnly; Secure; SameSite=Strict`:**
  - se **rota** en cada uso;
  - tiene **detección de reutilización**: si alguien usa un refresh token ya usado, se revoca toda la familia de tokens.
- **CSRF:** patrón _double-submit_ (cookie legible + cabecera `X-CSRF-Token`) en los endpoints que usan cookie, además de `SameSite=Strict`.
- **Segundo factor:** **TOTP real** (RFC 6238, compatible con Google Authenticator) con `otplib`. Se pide en el login y para confirmar cada transferencia (autenticación reforzada, ADR-0011).
- **Mismo origen:** el front llama a `/api/*` en su propio dominio y Vercel lo reescribe hacia el BFF (ADR-0012). Así la cookie es de primera parte.

## Consecuencias

- Al recargar la página se pierde el access token. El shell llama a `/auth/refresh` al arrancar para recuperar la sesión de forma transparente.
- Para que un revisor pueda probar la demo, el README publicará el secreto TOTP (o un QR) de los usuarios de demostración.
