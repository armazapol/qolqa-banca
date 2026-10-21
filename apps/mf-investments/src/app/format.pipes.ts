import { Pipe, type PipeTransform } from '@angular/core';

/*
 * Formato peruano con Intl (es-PE): coma de miles, punto decimal, "US$" y "S/".
 * Evita registrar locale data de Angular solo para dos formatos.
 */
const usd = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const percent = new Intl.NumberFormat('es-PE', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});
const quantity = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 8 });

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null, currency: 'USD' | 'PEN' = 'USD'): string {
    if (value === null) return '—';
    const sign = value < 0 ? '-' : '';
    return `${sign}${currency === 'USD' ? 'US$' : 'S/'} ${usd.format(Math.abs(value))}`;
  }
}

@Pipe({ name: 'pct' })
export class PercentPipe implements PipeTransform {
  transform(value: number | null): string {
    return value === null ? '—' : percent.format(value);
  }
}

@Pipe({ name: 'qty' })
export class QuantityPipe implements PipeTransform {
  transform(value: number): string {
    return quantity.format(value);
  }
}
