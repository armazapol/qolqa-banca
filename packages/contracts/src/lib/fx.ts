/** Tipo de cambio oficial publicado por el BCRP (S/ por US$). */
export interface OfficialFxRate {
  buy: number;
  sell: number;
  /** Fecha del dato en el BCRP, formato YYYY-MM-DD. */
  date: string;
  source: 'BCRP';
}

/**
 * Cotización referencial del banco, simulada alrededor de la tasa oficial
 * (ADR-0017). Siempre se muestra marcada como simulada.
 */
export interface BankFxQuote {
  buy: number;
  sell: number;
  official: OfficialFxRate;
  simulated: true;
  updatedAt: string;
}

export interface FxHistoryPoint {
  date: string;
  sell: number;
}
