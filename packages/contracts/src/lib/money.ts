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

const formatters: Record<Currency, Intl.NumberFormat> = {
  PEN: new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }),
  USD: new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }),
};

export function formatCents(cents: number, currency: Currency): string {
  return formatters[currency].format(cents / 100);
}
