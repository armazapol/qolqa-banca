import { createTransferRequestSchema } from './transfers.js';
import { formatCents, toCents } from './money.js';
import { maskAccountNumber, maskCard } from './masking.js';

describe('money', () => {
  it.each([
    ['1', 100],
    ['1.5', 150],
    ['1234.05', 123405],
    ['0.01', 1],
  ])('toCents(%s) = %i', (input, expected) => {
    expect(toCents(input)).toBe(expected);
  });

  it('evita errores de coma flotante (0.1 + 0.2)', () => {
    expect(toCents('0.1') + toCents('0.2')).toBe(toCents('0.3'));
  });

  it('formatea en soles con locale es-PE', () => {
    expect(formatCents(123405, 'PEN')).toBe('S/ 1,234.05');
    expect(formatCents(50, 'USD')).toBe('US$ 0.50');
    expect(formatCents(-2550, 'PEN')).toBe('-S/ 25.50');
  });
});

describe('createTransferRequestSchema', () => {
  const valid = {
    fromAccountId: '7f1b0e9a-2c4d-4e5f-8a9b-0c1d2e3f4a5b',
    toAccountNumber: '19412345678901',
    amount: '150.50',
    description: 'Pago alquiler octubre',
    otp: '123456',
  };

  it('acepta una transferencia válida', () => {
    expect(createTransferRequestSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['importe con 3 decimales', { amount: '1.234' }],
    ['importe cero', { amount: '0.00' }],
    ['importe negativo', { amount: '-5' }],
    ['cuenta corta', { toAccountNumber: '123' }],
    ['OTP de 5 dígitos', { otp: '12345' }],
    ['HTML en la descripción', { description: '<img src=x onerror=alert(1)>' }],
  ])('rechaza %s', (_, override) => {
    expect(
      createTransferRequestSchema.safeParse({ ...valid, ...override }).success,
    ).toBe(false);
  });
});

describe('masking', () => {
  it('muestra solo los últimos 4 dígitos de la cuenta', () => {
    expect(maskAccountNumber('19412345678901')).toBe('****8901');
  });

  it('muestra BIN y últimos 4 de la tarjeta', () => {
    expect(maskCard('455788', '1234')).toBe('4557 88** **** 1234');
  });
});
