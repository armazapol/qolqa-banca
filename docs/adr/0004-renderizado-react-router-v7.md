# ADR-0004: Renderizado con React Router v7 (estático + SSR + cliente)

- **Estado:** Aceptado
- **Fecha:** 2026-10-21
- **Reemplaza:** la propuesta inicial de "modo data / solo SPA"

## Contexto

Requisito del proyecto: usar páginas estáticas **y** SSR, siempre que sea gratuito. Restricciones:

- El access token vive solo en la memoria del navegador (ADR-0009), así que el servidor no puede renderizar datos privados sin rediseñar la autenticación.
- Las páginas privadas no deben cachearse en una CDN ni indexarse.
- El microfrontend es un custom element y solo puede renderizarse en el navegador.

## Opciones consideradas

1. **Modo data (SPA pura):** simple, pero no cumple el requisito de SSR.
2. **Modo framework con SSR en todas las rutas:** el servidor tendría que leer la cookie de sesión y llamar al BFF, lo que duplica la lógica de autenticación y deja datos bancarios en HTML de servidor.
3. **Modo framework con renderizado por ruta (híbrido)**, según el tipo de página.

## Decisión

Opción 3: **React Router v7 en modo framework**, desplegado en **Vercel Hobby (gratuito)**, que soporta prerenderizado y funciones SSR.

| Tipo                                                  | Rutas                                                              | Por qué                                                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Estático (prerender en build)**                     | `/`, `/seguridad`, `/legal/privacidad`, `/legal/cookies`           | Contenido que no cambia; máximo rendimiento (LCP) y SEO                                                                            |
| **SSR (Vercel Function)**                             | `/tipo-de-cambio`                                                  | Dato público que cambia a diario y es útil para SEO; se cachea en la CDN con `Cache-Control: s-maxage=300, stale-while-revalidate` |
| **Solo cliente (`clientLoader` + `HydrateFallback`)** | `/app/*` (dashboard, movimientos, transferir, perfil, inversiones) | Datos privados con token en memoria; `noindex`; sin caché                                                                          |

Microfrontend: el remote Angular se carga con la **API de runtime** de Module Federation (`@module-federation/enhanced/runtime`, `loadRemote`) solo en el navegador. Así el build SSR no tiene que resolver el remote.

## Consecuencias

- Se demuestran los tres modos de renderizado y cuándo conviene cada uno.
- El plan Hobby de Vercel es gratuito para proyectos personales y no comerciales, como este portafolio.
- El arranque en frío de la función SSR es mínimo, gracias a la caché de la CDN.
