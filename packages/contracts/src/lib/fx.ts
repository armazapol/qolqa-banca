import { z } from 'zod';

/** Tipo de cambio oficial publicado por el BCRP (S/ por US$). */
export const officialFxRateSchema = z.object({
  buy: z.number(),
  sell: z.number(),
  /** Fecha del dato en el BCRP, formato YYYY-MM-DD. */
  date: z.string(),
  source: z.literal('BCRP'),
});
export type OfficialFxRate = z.infer<typeof officialFxRateSchema>;

/**
 * Cotización referencial del banco, simulada alrededor de la tasa oficial
 * (ADR-0017). Siempre se muestra marcada como simulada.
 */
export const bankFxQuoteSchema = z.object({
  buy: z.number(),
  sell: z.number(),
  official: officialFxRateSchema,
  simulated: z.literal(true),
  updatedAt: z.string(),
});
export type BankFxQuote = z.infer<typeof bankFxQuoteSchema>;

export const fxHistoryPointSchema = z.object({
  date: z.string(),
  sell: z.number(),
});
export type FxHistoryPoint = z.infer<typeof fxHistoryPointSchema>;
