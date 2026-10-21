import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/errors';

/** Estado del servidor (ADR-0005): caché, reintentos y datos frescos al volver a la pestaña. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Los errores 4xx no se arreglan reintentando; los de red o 5xx sí, hasta 2 veces.
        retry: (failureCount, error) =>
          !(
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500
          ) && failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
}
