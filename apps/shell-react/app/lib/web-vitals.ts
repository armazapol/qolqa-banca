import { type Metric, onCLS, onINP, onLCP } from 'web-vitals';
import { trackEvent } from './analytics';

/**
 * Core Web Vitals reales de los usuarios (RUM) → GA4, solo con consentimiento
 * (trackEvent no envía nada sin él). ADR-0014 / ADR-0021.
 */
export function registerWebVitals(): void {
  const send = (metric: Metric) =>
    trackEvent('web_vitals', {
      metric_name: metric.name,
      // CLS es un ratio pequeño: se escala para que GA4 lo agregue como entero.
      value: Math.round(
        metric.name === 'CLS' ? metric.value * 1000 : metric.value,
      ),
      metric_rating: metric.rating,
      metric_id: metric.id,
      non_interaction: true,
    });
  onCLS(send);
  onINP(send);
  onLCP(send);
}
