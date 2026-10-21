import { parseTick, streamUrl } from './binance';
import { buildRows, buildTotals } from './portfolio';

describe('Binance', () => {
  it('construye la URL del stream combinado de miniTicker', () => {
    expect(streamUrl(['BTCUSDT', 'ETHUSDT'])).toBe(
      'wss://data-stream.binance.vision/stream?streams=btcusdt@miniTicker/ethusdt@miniTicker',
    );
  });

  it('interpreta un mensaje válido', () => {
    const message = {
      stream: 'btcusdt@miniTicker',
      data: { s: 'BTCUSDT', c: '84734.00', o: '82470.11' },
    };
    expect(parseTick(message)).toEqual({
      symbol: 'BTCUSDT',
      price: 84734,
      open24h: 82470.11,
    });
  });

  it.each([
    ['nulo', null],
    ['sin data', { stream: 'x' }],
    ['precio no numérico', { data: { s: 'BTCUSDT', c: 'abc', o: '1' } }],
    ['apertura en cero', { data: { s: 'BTCUSDT', c: '1', o: '0' } }],
  ])('descarta un mensaje inválido (%s)', (_, message) => {
    expect(parseTick(message)).toBeNull();
  });
});

describe('Cálculo del portafolio', () => {
  const holdings = [
    { symbol: 'BTCUSDT', name: 'Bitcoin', quantity: 0.5, avgPriceUsd: 60_000 },
    { symbol: 'ETHUSDT', name: 'Ethereum', quantity: 2, avgPriceUsd: 3_000 },
  ];

  it('calcula valor, ganancia y variación diaria por posición', () => {
    const [btc] = buildRows(holdings, {
      BTCUSDT: { symbol: 'BTCUSDT', price: 66_000, open24h: 60_000 },
    });
    expect(btc).toMatchObject({
      valueUsd: 33_000,
      costUsd: 30_000,
      pnlUsd: 3_000,
      pnlPct: 0.1,
      change24hPct: 0.1,
    });
  });

  it('una posición sin precio todavía no suma al total y lo marca incompleto', () => {
    const rows = buildRows(holdings, {
      BTCUSDT: { symbol: 'BTCUSDT', price: 66_000, open24h: 60_000 },
    });
    const totals = buildTotals(rows, 3.5);
    expect(totals).toMatchObject({
      valueUsd: 33_000,
      costUsd: 30_000,
      pnlUsd: 3_000,
      complete: false,
    });
    expect(totals.valuePen).toBeCloseTo(115_500);
  });

  it('sin tipo de cambio no inventa el valor en soles', () => {
    expect(buildTotals(buildRows(holdings, {}), null).valuePen).toBeNull();
  });
});
