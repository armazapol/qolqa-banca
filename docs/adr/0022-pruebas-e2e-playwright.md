# ADR-0022: Pruebas E2E con Playwright

- **Estado:** Aceptado
- **Fecha:** 2026-10-21
- **Amplía:** ADR-0008 (estrategia de testing) y ADR-0021 (CSP)

## Contexto

Las pruebas unitarias (Jest + Testing Library + MSW) validan componentes aislados con la red simulada. Faltaba comprobar lo que solo aparece con todo integrado: cookies `__Host-` reales, la CSP de producción, el SSR, el microfrontend Angular cargado por Native Federation, el WebSocket de notificaciones y el _service worker_. Además debía cubrirse en los tres motores de navegador y en móvil.

## Decisiones confirmadas

| #   | Tema               | Decisión                                                                                                                                            |
| --- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Qué se prueba      | **Builds de producción** (BFF, remote Angular, shell SSR) detrás de un _edge_ HTTPS que imita a Vercel. No se usa el servidor de desarrollo de Vite |
| 2   | Base de datos      | Base `qolqa_e2e` separada en el mismo PostgreSQL de Docker: migraciones y seed en cada ejecución. La de desarrollo nunca se toca                    |
| 3   | Segundo factor     | Códigos TOTP generados en el test con `otplib` a partir del secreto de usuarios **exclusivos de E2E**. Sin atajos ni _backdoors_ en el BFF          |
| 4   | Servicios externos | BCRP simulado por HTTP; WebSocket de Binance simulado con `page.routeWebSocket`; GA4 servido vacío y sin envíos a Google                            |
| 5   | Navegadores        | Chromium, Firefox y WebKit en escritorio, más **Pixel 7** (`movil`) para los casos marcados `@movil`                                                |
| 6   | Accesibilidad      | `@axe-core/playwright` con WCAG 2.2 AA; el test falla ante violaciones **serias o críticas**                                                        |
| 7   | Regresión visual   | No se incluye (capturas frágiles entre sistemas operativos; el coste de mantenerlas supera su valor aquí)                                           |

## Arquitectura de la batería

```text
Playwright ──HTTPS──▶ edge :4300 (support/servers.mjs, certificado autofirmado)
                        ├─ /api/*            → BFF NestJS (build) :3100 ── PostgreSQL qolqa_e2e
                        ├─ /socket.io (WS)   → BFF :3100 (upgrade reenviado por TCP)
                        ├─ /mf/investments/* → archivos estáticos del remote Angular
                        └─ resto             → react-router-serve (SSR) :4302
                                               + CSP por hashes de build/csp-static.json en páginas prerenderizadas
              stub :3101 → BCRP simulado + reparto de usuarios de prueba
```

| Pieza               | Dónde                                          | Por qué                                                                                                                                       |
| ------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Preparación         | `apps/shell-react-e2e/support/prepare.mjs`     | Certificado, base de datos, seed con 150 usuarios E2E (`.e2e-users.json`, ignorado por git) y builds. `E2E_SKIP_BUILD=1` reutiliza los builds |
| Edge HTTPS          | `apps/shell-react-e2e/support/servers.mjs`     | Reproduce los _rewrites_ y cabeceras que hará `vercel.json` en la Fase 6, y da un origen seguro (ver hallazgos)                               |
| Un usuario por test | `takeUser()` en `src/fixtures.ts`              | Los tests corren en paralelo y el TOTP tiene anti-replay: compartir usuario provocaría falsos fallos                                          |
| IP por test         | Fixture `extraHTTPHeaders` (`X-Forwarded-For`) | El BFF limita a 5 logins/min **por IP** (`TRUST_PROXY=1`, como detrás de Vercel/Render); el límite sigue activo y se prueba                   |
| Violaciones de CSP  | Fixture automático `cspViolations`             | Escucha `securitypolicyviolation` en cada página: **todos los tests terminan con 0 violaciones**                                              |
| Accesibilidad       | Fixture `expectAccessible`                     | Espera a que terminen las animaciones (CSS y Motion) antes de analizar, para medir el contraste final y no un fotograma intermedio            |
| Inactividad         | `page.clock.install()` + `runFor`              | Los 5 minutos de inactividad se simulan sin esperar en tiempo real                                                                            |

## Escenarios

| Spec                  | Qué cubre                                                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public.spec.ts`      | Portada prerenderizada con CSP por hashes y accesible (`@movil`); `/tipo-de-cambio` con SSR; 404 real; consentimiento (rechazar, aceptar, cambiar la decisión)             |
| `security.spec.ts`    | Redirección a `/ingresar?redirigir=…`; error de credenciales genérico; CSP con nonce distinto por petición; OTP reutilizado rechazado; sesión tras recargar; salir         |
| `banking.spec.ts`     | Saldos y números enmascarados (`@movil`) y accesibles; revelar cuenta; paginación; saldo insuficiente; OTP inválido; transferencia con aviso en tiempo real en otra sesión |
| `investments.spec.ts` | `<bank-investments>` en Shadow DOM, sin Zone.js, con precios en vivo, accesible; navegación pedida por el remote mediante eventos                                          |
| `session-pwa.spec.ts` | Aviso y cierre por inactividad; "Seguir conectado"; sin conexión: páginas públicas desde caché y área privada sin caché (solo Chromium)                                    |

Resultado: **69 tests pasan y 2 se omiten a propósito** (el modo sin conexión se valida solo en Chromium).

## Hallazgos y cambios en la aplicación

La batería encontró problemas reales que las pruebas unitarias no podían ver:

| Hallazgo                                                                                                                                                                                                        | Solución                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/tipo-de-cambio` se renderizaba vacío en SSR: el servidor del shell no sabía dónde estaba el BFF                                                                                                               | Variable `API_URL` en el servidor SSR. **También hará falta en producción** (Fase 6)                                                                     |
| WebKit se quedaba en el `HydrateFallback`: aplica `upgrade-insecure-requests` incluso en `http://localhost` y bloquea todos los recursos                                                                        | La CSP solo incluye `upgrade-insecure-requests` si la petición llegó por HTTPS (`isHttpsRequest`, vía `x-forwarded-proto`)                               |
| WebKit perdía la sesión al recargar: rechaza cookies `Secure`/`__Host-` en `http://localhost`                                                                                                                   | La batería corre sobre **HTTPS** con certificado autofirmado (el _edge_), igual que en producción. No se relajaron las cookies                           |
| **Firefox no cargaba el microfrontend**: "Import maps are not allowed after a module load or preload has started". El orquestador inserta el import map al abrir Inversiones, cuando la página ya cargó módulos | **es-module-shims en _shim mode_** en todos los navegadores (`importmap-shim` + `importShim`), cargado solo al abrir Inversiones. Ver "Cambio en la CSP" |
| Contraste del indicador "En vivo" del remote: 4,17:1 (mínimo 4,5:1)                                                                                                                                             | Texto más oscuro con `light-dark(#176b3c, #5cc98a)`: 5,11:1                                                                                              |
| `aria-hidden-focus` en el gráfico de tipo de cambio: tenía elementos enfocables ocultos al lector de pantalla                                                                                                   | `inert` en lugar de `aria-hidden`: ni foco ni lectura. La tabla equivalente sigue siendo la alternativa accesible                                        |
| El _service worker_ no se registra con un certificado autofirmado en Chromium                                                                                                                                   | Solo en pruebas: `--ignore-certificate-errors` en el proyecto `chromium`                                                                                 |
| `openssl` fallaba porque `OPENSSL_CONF` del sistema apuntaba a un archivo inexistente                                                                                                                           | La preparación usa su propio `openssl.cnf` mínimo, sin depender de la configuración de la máquina                                                        |

## Cambio en la CSP (confirmado)

es-module-shims ejecuta cada módulo del remote desde una URL `blob:`: el nonce cubre los scripts que inyecta, pero no los `import()` de blobs. Opciones evaluadas:

1. **`blob:` solo en el área privada (elegida).** Inversiones funciona en los tres motores con un único camino de carga.
2. CSP intacta y Firefox sin Inversiones (la degradación ya existente). Descartada: deja fuera un navegador principal.
3. Shims y `blob:` solo en navegadores que lo necesiten. Descartada: dos caminos de carga y una CSP dependiente del User-Agent.

`blob:` se añade a `script-src` solo en los documentos de `/ingresar` y `/app/*` (`isPrivateAreaPath` en `app/lib/csp/policy.ts`). Las páginas públicas no cambian. Como desde ellas se entra a la banca con navegación completa (ADR-0021), la CSP del área privada es la que rige durante toda la sesión. El riesgo añadido es bajo: para crear un blob, un atacante ya necesita ejecutar JavaScript, que es lo que la CSP impide. Lo verifican una prueba unitaria y otra E2E (`security.spec.ts`).

## Consecuencias

- La CI de la Fase 6 debe levantar PostgreSQL, ejecutar `pnpm nx e2e shell-react-e2e` y guardar el informe y las trazas de Playwright como artefactos.
- Los builds E2E usan variables propias (`SHELL_BUILD_ENV` en `support/config.mjs`): forman parte de las entradas de caché de Nx, así que no se mezclan con los builds de producción.
- Coste aceptado: la ejecución completa tarda en torno a 2 minutos más los builds, y depende de Docker.

## Dónde se aplica

- `apps/shell-react-e2e/` (configuración, soporte y specs)
- `apps/api/prisma/seed.ts` (usuarios E2E opcionales: `SEED_E2E_USERS`, `SEED_E2E_OUTPUT`)
- `apps/shell-react/app/lib/csp/policy.ts`, `apps/shell-react/app/entry.server.tsx`
- `apps/shell-react/app/features/investments/load-investments.ts`
- `apps/shell-react/app/features/fx/FxHistoryChart.tsx`, `apps/mf-investments/src/app/investments.component.scss`
