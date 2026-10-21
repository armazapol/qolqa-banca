# ADR-0018: Implementación del BFF y controles de seguridad

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Decisiones

| #   | Tema          | Decisión                                                                                                | Motivo                                                                                       |
| --- | ------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Servidor HTTP | **Express** (NestJS 11 usa Express 5)                                                                   | Es el predeterminado y el más maduro con Helmet, cookies y CSRF                              |
| 2   | Validación    | **Zod compartido** (`packages/contracts`) mediante `nestjs-zod`                                         | Las mismas reglas en front y back, una sola fuente de verdad                                 |
| 3   | Contraseñas   | **Argon2id** (`@node-rs/argon2`) con 19 MiB, t=2 y p=1                                                  | Mínimo recomendado por OWASP; trae binarios precompilados, sin scripts de instalación        |
| 4   | JWT           | **HS256**, con `issuer` y `audience` distintos para el access token y el reto MFA                       | Solo el BFF emite y verifica tokens; la audiencia evita usar un token en el sitio equivocado |
| 5   | Secretos TOTP | **AES-256-GCM** con la clave en una variable de entorno                                                 | Cifrado autenticado: una alteración se detecta                                               |
| 6   | WebSocket     | **Socket.IO** con salas por usuario, solo transporte `websocket`                                        | Reconexión automática; sin long-polling no hacen falta sesiones pegajosas                    |
| 7   | Fuerza bruta  | `@nestjs/throttler`: 100 req/min global y 5 req/min en login y OTP; **bloqueo de 15 min tras 5 fallos** | Defensa por IP y por cuenta                                                                  |
| 8   | Logs          | **Pino** (`nestjs-pino`) en JSON, ocultando `authorization`, `cookie`, `x-csrf-token` y `set-cookie`    | Logs estructurados sin credenciales                                                          |
| 9   | Versiones     | NestJS 11, Prisma 7.10.1, Apollo Server 5, PostgreSQL 17                                                | Ver "Versiones" más abajo                                                                    |

## Controles de seguridad implementados

- **Sin enumeración de usuarios:** mismo mensaje para un usuario inexistente, una contraseña incorrecta o una cuenta bloqueada. Si el usuario no existe, Argon2 se ejecuta igual contra un hash ficticio para igualar los tiempos de respuesta.
- **Login en dos pasos:**
  - contraseña → reto MFA (JWT de 5 min) → código TOTP;
  - el TOTP acepta el periodo actual y el anterior;
  - **el mismo código no se puede reutilizar** (`lastTotpStep`, RFC 6238 §5.2).
- **Refresh token:**
  - valor opaco de 256 bits, guardado en base de datos como **SHA-256**;
  - rotación en cada uso;
  - **detección de reutilización**: se revoca toda la familia;
  - marcado condicional (`updateMany ... usedAt: null`) contra condiciones de carrera.
- **Cookies:**
  - prefijo `__Host-` en producción;
  - `httpOnly`, `Secure` y `SameSite=Strict`;
  - ventana deslizante de 30 min.
- **CSRF:** _signed double-submit_ (HMAC) solo en los endpoints autenticados por cookie (`/auth/refresh` y `/auth/logout`). Los endpoints con Bearer token no son vulnerables a CSRF.
- **Transferencias:**
  - autenticación reforzada (TOTP) en cada operación;
  - cabecera `Idempotency-Key` obligatoria (UUID);
  - transacción **SERIALIZABLE** con hasta 3 reintentos;
  - débito condicional (`balance >= importe`);
  - límite diario calculado en hora de Lima (UTC-5);
  - importes en **céntimos enteros**.
- **IDOR:** toda consulta filtra por `userId` del token.
- **Datos enmascarados:**
  - la cuenta se muestra como `****1234`;
  - de la tarjeta solo se guardan el BIN y los últimos 4 dígitos (PCI DSS);
  - revelar el número completo queda **auditado**.
- **GraphQL:**
  - límite de profundidad 6 (validación propia);
  - introspección desactivada en producción;
  - CSRF prevention de Apollo activo;
  - paginación por cursor con un máximo de 50.
- **Cabeceras:** Helmet con CSP estricta en producción (relajada en desarrollo para Swagger UI y Apollo Sandbox); `trust proxy` configurable para obtener la IP real detrás de Render/Vercel.
- **Configuración validada con Zod al arrancar:** si falta un secreto o es inválido, el BFF no arranca.
- **Auditoría:**
  - se registran login, OTP, bloqueo, refresh, reutilización de token, logout, transferencias y revelado de cuenta;
  - un fallo al auditar no tumba la operación, pero queda en los logs.

## Versiones

- **NestJS 11** y no 12: es la versión que soporta Nx 23. Los paquetes de Nest se fijaron a su línea compatible (`@nestjs/graphql` 13, `@nestjs/jwt` 11, `@nestjs/config` 4, etc.).
- **Prisma 7.10.1 estable:** la etiqueta `latest` de npm apunta a `8.0.0-rc`.
- **Apollo Server 5:** `@nestjs/apollo` 13 arrastra el plugin de GraphQL Playground, que declara compatibilidad con Apollo 4, y pnpm muestra un aviso de _peer dependency_. Ese plugin está obsoleto y desactivado (`playground: false`), y Apollo 4 ya no tiene soporte, así que el aviso se acepta.

## Cadena de suministro (pnpm `allowBuilds`)

| Paquete                            | Script       | Motivo                                                                |
| ---------------------------------- | ------------ | --------------------------------------------------------------------- |
| `nx`, `@swc/core`                  | ✅ permitido | Necesarios para el workspace                                          |
| `prisma`, `@prisma/engines`        | ✅ permitido | Descargan el schema engine que usan las migraciones                   |
| `esbuild`                          | ✅ permitido | Verifica su binario (lo usa `tsx`)                                    |
| `@parcel/watcher`, `unrs-resolver` | ❌ denegado  | Traen binarios precompilados; el script solo compila como alternativa |
| `@apollo/protobufjs`               | ❌ denegado  | Postinstall innecesario                                               |
| `@scarf/scarf`                     | ❌ denegado  | **Telemetría** que llega como dependencia de swagger-ui               |

## Limitaciones conocidas

- Los tickets de WebSocket se guardan en memoria: sirve con una sola instancia. Con varias réplicas habría que usar Redis.
- Varias pestañas pueden refrescar la sesión a la vez, lo que dispararía la detección de reutilización. El shell lo evitará serializando el refresh con la **Web Locks API** (Fase 2).

## Dónde se aplica

`apps/api/src/{auth,common,transfers,accounts,fx,notifications,audit,config}` y `apps/api/prisma/schema.prisma`.
