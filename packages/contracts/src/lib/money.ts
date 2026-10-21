import { z } from 'zod';

export const currencySchema = z.enum(['PEN', 'USD']);
export type Currency = z.infer<typeof currencySchema>;

/** Importe escrito por el usuario: hasta 2 decimales, punto como separador. */
export const amountInputSchema = z
  .string()
  .trim()
  .regex(
    /^\d{1,9}(\.\d{1,2})?$/,
    'Ingresa un importe válido (máximo 2 decimales)',
  )
  .refine((value) => toCents(value) > 0, 'El importe debe ser mayor a 0');

/**
 * Convierte "1234.5" en 123450 céntimos sin pasar por coma flotante.
 * Se asume una entrada ya validada con `amountInputSchema`.
 */
export function toCents(amount: string): number {
  const [units, decimals = ''] = amount.trim().split('.');
  return Number(units) * 100 + Number(decimals.padEnd(2, '0'));
}

/** Símbolos usados en Perú (SBS): "S/" y "US$". Intl con es-PE muestra "USD". */
export const CURRENCY_SYMBOL: Record<Currency, string> = {
  PEN: 'S/',
  USD: 'US$',
};

const amountFormatter = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 123405, 'USD' → "US$ 1,234.05"; los negativos llevan el signo antes del símbolo. */
export function formatCents(cents: number, currency: Currency): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}${CURRENCY_SYMBOL[currency]} ${amountFormatter.format(Math.abs(cents) / 100)}`;
}
