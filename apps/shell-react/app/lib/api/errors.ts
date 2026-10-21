/** Error HTTP con el mensaje legible que devuelve el BFF. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const FALLBACK = 'No pudimos completar la operación. Inténtalo nuevamente.';

/** El BFF responde { message: string | string[] }; la validación Zod, { message, errors }. */
export async function toApiError(response: Response): Promise<ApiError> {
  let message = FALLBACK;
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === 'string') message = body.message;
    else if (Array.isArray(body.message)) message = body.message.join('. ');
  } catch {
    // Respuesta sin JSON (p. ej. un 502 del proxy): se usa el mensaje genérico.
  }
  if (response.status === 429) {
    message = 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.';
  }
  return new ApiError(response.status, message);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : FALLBACK;
}
