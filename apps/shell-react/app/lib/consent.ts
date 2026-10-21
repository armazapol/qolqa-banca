export type AnalyticsConsent = 'granted' | 'denied';

interface StoredConsent {
  analytics: AnalyticsConsent;
  decidedAt: number;
}

const KEY = 'qolqa:consent';
/** La decisión se vuelve a pedir pasados 12 meses (ADR-0021). */
export const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;

/** Preferencia guardada en este navegador; null si no hay decisión vigente. */
export function readConsent(now = Date.now()): AnalyticsConsent | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<StoredConsent>;
    const valid =
      (stored.analytics === 'granted' || stored.analytics === 'denied') &&
      typeof stored.decidedAt === 'number' &&
      now - stored.decidedAt < CONSENT_TTL_MS;
    return valid ? (stored.analytics as AnalyticsConsent) : null;
  } catch {
    // Almacenamiento bloqueado o dato corrupto: se vuelve a preguntar.
    return null;
  }
}

export function writeConsent(
  analytics: AnalyticsConsent,
  now = Date.now(),
): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ analytics, decidedAt: now } satisfies StoredConsent),
    );
  } catch {
    // Sin almacenamiento la decisión dura solo esta sesión.
  }
}

export function clearConsent(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nada que borrar.
  }
}
