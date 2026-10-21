# Requisitos → herramienta → ubicación

Trazabilidad entre cada requisito de la oferta, la herramienta elegida, la decisión (ADR) y el lugar del código donde se usa.

> Se actualiza al cerrar cada fase. Una ruta en _cursiva_ indica que aún no está implementada.

## Experiencia y dominio

| Requisito                                      | Cómo se demuestra                                     | ADR        | Ubicación                                 |
| ---------------------------------------------- | ----------------------------------------------------- | ---------- | ----------------------------------------- |
| Frontend con React y/o Angular                 | Shell React + microfrontend Angular                   | 0003       | _apps/shell-react_, _apps/mf-investments_ |
| Sector financiero / regulación bancaria        | Controles SBS / Ley 29733                             | 0011       | _ver tabla del ADR-0011_                  |
| Aplicaciones críticas y de alta disponibilidad | Caché y reintentos, PWA, monitorización, CI con tests | 0005, 0014 | _pendiente_                               |

## Técnicos

| Requisito                     | Herramienta                                                            | ADR        | Ubicación                              |
| ----------------------------- | ---------------------------------------------------------------------- | ---------- | -------------------------------------- |
| JavaScript / TypeScript       | TypeScript strict                                                      | 0002       | `tsconfig.base.json`                   |
| HTML5, CSS3, SASS             | SCSS en Angular, CSS + `@layer` en React                               | 0007       | _apps/mf-investments/src/\**/*.scss_   |
| Patrones Flux / Redux         | Redux Toolkit                                                          | 0005       | _apps/shell-react/src/app/store/_      |
| Webpack / Vite                | Vite (shell), Webpack (remote)                                         | 0003       | _vite.config.ts_, _webpack.config.js_  |
| Jest + Testing Library        | Jest, Testing Library, MSW, jest-axe                                   | 0008       | _\*\*/\*.spec.ts(x)_                   |
| APIs REST / GraphQL           | NestJS REST + Apollo GraphQL; Orval + GraphQL Codegen                  | 0006       | _apps/api_, _apps/shell-react/src/api_ |
| Interfaces responsivas        | Tailwind (mobile-first) + breakpoints de MUI                           | 0007       | _pendiente_                            |
| Material UI / Tailwind        | MUI + Tailwind                                                         | 0007       | _apps/shell-react_                     |
| Rendimiento / Core Web Vitals | Prerender/SSR, lazy loading, `web-vitals`, Lighthouse CI               | 0004, 0014 | _pendiente_                            |
| PWA                           | vite-plugin-pwa (Workbox)                                              | —          | _pendiente_                            |
| Web Components                | Angular Elements `<bank-investments>`                                  | 0003       | _apps/mf-investments_                  |
| WebSockets                    | Gateway NestJS (tipo de cambio, notificaciones) + Binance              | 0006, 0012 | _pendiente_                            |
| Accesibilidad WCAG            | eslint-plugin-jsx-a11y, jest-axe, Playwright + axe                     | 0008       | _pendiente_                            |
| Animaciones y transiciones    | Motion (React), `@angular/animations`                                  | —          | _pendiente_                            |
| Autenticación y tokens        | JWT en memoria + refresh token httpOnly con rotación + TOTP            | 0009       | _pendiente_                            |
| XSS                           | DOMPurify, CSP (Helmet), sin `dangerouslySetInnerHTML` sin sanitizar   | 0009       | _pendiente_                            |
| CSRF                          | Double-submit + SameSite=Strict                                        | 0009       | _pendiente_                            |
| Validación y sanitización     | Zod (compartido front/back), React Hook Form                           | 0006       | _packages/contracts_                   |
| CORS / CSP                    | CORS en el BFF con lista blanca; CSP con Helmet y cabeceras de Vercel  | 0009, 0012 | _pendiente_                            |
| Analítica                     | GA4 + Consent Mode v2                                                  | 0014       | _pendiente_                            |
| CI/CD                         | GitHub Actions + Vercel + Render                                       | 0012       | _.github/workflows_                    |
| SEO                           | Prerender + SSR públicos, metadatos, `robots.txt`, `noindex` en `/app` | 0004       | _pendiente_                            |
| UX/UI                         | Tokens de diseño, feedback de estados, `prefers-reduced-motion`        | 0007       | _packages/ui-tokens_                   |

## Productividad (no exigidas, pero aceleran el desarrollo)

| Herramienta                    | Para qué                                                 | ADR  |
| ------------------------------ | -------------------------------------------------------- | ---- |
| TanStack Query                 | Estado del servidor sin código manual de loading y error | 0005 |
| Orval / GraphQL Codegen        | Clientes y tipos generados desde los contratos           | 0006 |
| React Hook Form + Zod          | Formularios performantes con validación tipada           | 0006 |
| MSW                            | Mocks compartidos entre tests y desarrollo               | 0008 |
| Husky, lint-staged, commitlint | Calidad automática en cada commit                        | 0016 |
