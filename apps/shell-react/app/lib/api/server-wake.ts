/**
 * El BFF corre en el plan gratuito de Render y se duerme tras 15 minutos sin
 * uso: la primera petición puede tardar cerca de un minuto (ADR-0023). Si una
 * petición supera este umbral, la app avisa en lugar de parecer colgada.
 */
export const SLOW_REQUEST_MS = 4000;
export const SERVER_WAKING_EVENT = 'qolqa:server-waking';

let slowRequests = 0;

const emit = () => window.dispatchEvent(new Event(SERVER_WAKING_EVENT));

export const isServerWaking = (): boolean => slowRequests > 0;

/** Marca la petición como lenta si no ha terminado tras SLOW_REQUEST_MS. */
export async function trackSlowRequest<T>(request: Promise<T>): Promise<T> {
  let slow = false;
  const timer = setTimeout(() => {
    slow = true;
    slowRequests += 1;
    emit();
  }, SLOW_REQUEST_MS);
  try {
    return await request;
  } finally {
    clearTimeout(timer);
    if (slow) {
      slowRequests -= 1;
      emit();
    }
  }
}
