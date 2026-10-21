export { formatCents } from '@qolqa/contracts';

const dateTime = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Lima',
});

const dateOnly = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeZone: 'America/Lima',
});

/** Fechas siempre en hora de Lima, independientemente de la zona del navegador. */
export function formatDateTime(value: string | Date): string {
  return dateTime.format(new Date(value));
}

export function formatDate(value: string | Date): string {
  return dateOnly.format(new Date(value));
}
