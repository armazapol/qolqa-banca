import type { PriceTick } from './binance';
import type { Holding } from './portfolio.service';

export interface PositionRow {
  symbol: string;
  name: string;
  quantity: number;
  price: number | null;
  valueUsd: number | null;
  costUsd: number;
  pnlUsd: number | null;
  pnlPct: number | null;
  change24hPct: number | null;
}

export interface PortfolioTotals {
  valueUsd: number;
  costUsd: number;
  pnlUsd: number;
  pnlPct: number;
  valuePen: number | null;
  /** Falso mientras falte el precio de alguna posición. */
  complete: boolean;
}

/** Cálculo puro (sin Angular): fácil de probar y de razonar. */
export function buildRows(
  holdings: readonly Holding[],
  ticks: Readonly<Record<string, PriceTick>>,
): PositionRow[] {
  return holdings.map((holding) => {
    const tick = ticks[holding.symbol];
    const costUsd = holding.quantity * holding.avgPriceUsd;
    const valueUsd = tick ? holding.quantity * tick.price : null;
    const pnlUsd = valueUsd === null ? null : valueUsd - costUsd;
    return {
      symbol: holding.symbol,
      name: holding.name,
      quantity: holding.quantity,
      price: tick?.price ?? null,
      valueUsd,
      costUsd,
      pnlUsd,
      pnlPct: pnlUsd === null || costUsd === 0 ? null : pnlUsd / costUsd,
      change24hPct: tick ? (tick.price - tick.open24h) / tick.open24h : null,
    };
  });
}

export function buildTotals(
  rows: readonly PositionRow[],
  fxSell: number | null,
): PortfolioTotals {
  const priced = rows.filter((row) => row.valueUsd !== null);
  const valueUsd = priced.reduce((sum, row) => sum + (row.valueUsd ?? 0), 0);
  const costUsd = priced.reduce((sum, row) => sum + row.costUsd, 0);
  const pnlUsd = valueUsd - costUsd;
  return {
    valueUsd,
    costUsd,
    pnlUsd,
    pnlPct: costUsd === 0 ? 0 : pnlUsd / costUsd,
    valuePen: fxSell === null ? null : valueUsd * fxSell,
    complete: priced.length === rows.length,
  };
}
