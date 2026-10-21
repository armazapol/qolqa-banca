import type { TypedDocumentString } from '../../generated/graphql/graphql';
import { ApiError } from './errors';
import { apiFetch } from './http';
import { notifySessionExpired, refreshSession } from './session';

interface GraphQLResponse<T> {
  data?: T | null;
  errors?: { message: string; extensions?: { code?: string } }[];
}

async function post<TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  variables?: TVariables,
  signal?: AbortSignal,
): Promise<GraphQLResponse<TResult>> {
  return apiFetch<GraphQLResponse<TResult>>('/api/graphql', {
    method: 'POST',
    body: JSON.stringify({ query: document.toString(), variables }),
    signal,
  });
}

/**
 * Ejecuta un documento tipado por GraphQL Codegen. GraphQL responde 200 con
 * errores en el cuerpo, así que el caso "token expirado" se trata aquí.
 */
export async function gqlRequest<TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  variables?: TVariables,
  signal?: AbortSignal,
): Promise<TResult> {
  let result = await post(document, variables, signal);

  if (
    result.errors?.some((error) => error.extensions?.code === 'UNAUTHENTICATED')
  ) {
    if (!(await refreshSession())) {
      notifySessionExpired();
      throw new ApiError(401, 'Tu sesión expiró. Ingresa nuevamente.');
    }
    result = await post(document, variables, signal);
  }

  const [firstError] = result.errors ?? [];
  if (firstError || !result.data) {
    throw new ApiError(
      200,
      firstError?.message ?? 'Respuesta inválida del servidor',
    );
  }
  return result.data;
}
