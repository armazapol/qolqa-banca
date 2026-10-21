import { useEffect } from 'react';
import { useLocation, useMatches } from 'react-router';
import { trackPageView } from '../lib/analytics';
import { useAppSelector } from '../store/store';

/** Convierte /app/movimientos/7f1b… en /app/movimientos/:accountId (sin identificadores). */
export function toRoutePath(
  pathname: string,
  params: Record<string, string | undefined>,
): string {
  return Object.entries(params).reduce(
    (path, [name, value]) =>
      value && name !== '*' ? path.replace(value, `:${name}`) : path,
    pathname,
  );
}

/** page_view en cada cambio de ruta de la SPA (solo con consentimiento). */
export function AnalyticsTracker() {
  const location = useLocation();
  const matches = useMatches();
  const consent = useAppSelector((state) => state.consent.analytics);

  useEffect(() => {
    if (consent !== 'granted') return;
    const params = matches.at(-1)?.params ?? {};
    trackPageView(toRoutePath(location.pathname, params), document.title);
  }, [location.pathname, matches, consent]);

  return null;
}
