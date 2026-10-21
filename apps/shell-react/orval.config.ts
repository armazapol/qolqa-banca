import { defineConfig } from 'orval';

/**
 * Genera funciones y hooks de TanStack Query a partir del contrato OpenAPI
 * del BFF (apps/api/openapi.json). Todas las llamadas pasan por apiFetch,
 * que añade el token, el refresh automático y el manejo de errores (ADR-0019).
 */
export default defineConfig({
  qolqa: {
    input: { target: '../api/openapi.json' },
    output: {
      mode: 'tags-split',
      target: 'app/generated/rest/endpoints.ts',
      schemas: 'app/generated/rest/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      override: {
        mutator: { path: 'app/lib/api/http.ts', name: 'apiFetch' },
        fetch: { includeHttpResponseReturnType: false },
        query: { signal: true },
      },
    },
  },
});
