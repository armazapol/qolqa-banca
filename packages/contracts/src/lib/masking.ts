/** Enmascarado de datos sensibles (ADR-0011). */

/** 19412345678901 → ****8901 */
export function maskAccountNumber(number: string): string {
  return `****${number.slice(-4)}`;
}

/** BIN + últimos 4 → 4557 88** **** 1234 (PCI DSS: primeros 6 y últimos 4). */
export function maskCard(bin: string, last4: string): string {
  return `${bin.slice(0, 4)} ${bin.slice(4, 6)}** **** ${last4}`;
}
