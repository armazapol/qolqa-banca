import { z } from 'zod';
import { otpCodeSchema } from './auth.js';
import { amountInputSchema, type Currency } from './money.js';

/**
 * Lista blanca de caracteres para la descripción: evita contenido que pueda
 * interpretarse como HTML o script aunque luego se muestre escapado.
 */
const SAFE_TEXT = /^[\p{L}\p{N} .,\-_#/()]*$/u;

export const accountNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{14}$/, 'El número de cuenta debe tener 14 dígitos');

export const createTransferRequestSchema = z.object({
  fromAccountId: z.uuid('Selecciona una cuenta de origen'),
  toAccountNumber: accountNumberSchema,
  amount: amountInputSchema,
  description: z
    .string()
    .trim()
    .max(60, 'Máximo 60 caracteres')
    .regex(SAFE_TEXT, 'La descripción contiene caracteres no permitidos'),
  otp: otpCodeSchema,
});
export type CreateTransferRequest = z.infer<typeof createTransferRequestSchema>;

export const IDEMPOTENCY_HEADER = 'idempotency-key';

export interface TransferResponse {
  id: string;
  status: 'COMPLETED';
  amountCents: number;
  currency: Currency;
  toAccountNumberMasked: string;
  createdAt: string;
}
