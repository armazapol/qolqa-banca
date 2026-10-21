import * as Sentry from '@sentry/react-router';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';
import { sentryDataCollection, scrubEvent } from './lib/monitoring/scrub';
import { registerWebVitals } from './lib/web-vitals';

const dsn = import.meta.env.VITE_SENTRY_DSN;

// Sin DSN no se inicializa nada (ADR-0021). Session Replay desactivado a propósito:
// grabaría pantallas con saldos y datos personales.
if (dsn) {
  Sentry.init({
    dsn,
    environment:
      import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    integrations: [Sentry.reactRouterTracingIntegration()],
    tracesSampleRate: 0.1,
    // Solo se propaga la traza al BFF del mismo origen, nunca a terceros.
    tracePropagationTargets: [/^\/api\//],
    dataCollection: sentryDataCollection,
    beforeSend: scrubEvent,
  });
}

registerWebVitals();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter onError={Sentry.sentryOnError} />
    </StrictMode>,
  );
});
