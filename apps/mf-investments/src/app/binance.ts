/**
 * Precios públicos de mercado de Binance (ADR-0020).
 * data-stream.binance.vision es el endpoint que Binance publica solo para
 * datos de mercado: sin claves ni datos de usuario.
 */
export const BINANCE_STREAM_URL = 'wss://data-stream.binance.vision/stream';

export interface PriceTick {
  symbol: string;
  /** Último precio en USDT. */
  price: number;
  /** Precio de hace 24 h, para la variación diaria. */
  open24h: number;
}

/** URL del stream combinado de miniTicker (una actualización por segundo y símbolo). */
export function streamUrl(symbols: readonly string[]): string {
  const streams = symbols
    .map((symbol) => `${symbol.toLowerCase()}@miniTicker`)
    .join('/');
  return `${BINANCE_STREAM_URL}?streams=${streams}`;
}

/**
 * Valida un mensaje del WebSocket. Un tercero nunca es de confianza: si la
 * forma no es la esperada, el mensaje se descarta en lugar de romper la vista.
 */
export function parseTick(message: unknown): PriceTick | null {
  if (typeof message !== 'object' || message === null) return null;
  const data = (message as { data?: Record<string, unknown> }).data;
  if (!data || typeof data['s'] !== 'string') return null;

  const price = Number(data['c']);
  const open24h = Number(data['o']);
  if (!Number.isFinite(price) || !Number.isFinite(open24h) || open24h <= 0)
    return null;
  return { symbol: data['s'], price, open24h };
}
