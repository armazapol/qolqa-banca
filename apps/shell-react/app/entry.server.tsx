import { createReadableStreamFromReadable } from '@react-router/node';
import * as Sentry from '@sentry/react-router';
import { randomBytes } from 'node:crypto';
import type { ComponentProps } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import {
  type AppLoadContext,
  type EntryContext,
  ServerRouter,
} from 'react-router';
import {
  cspFromEnv,
  isHttpsRequest,
  isPrivateAreaPath,
} from './lib/csp/policy';
import { NonceProvider } from './lib/csp/nonce';
import { sentryDataCollection, scrubEvent } from './lib/monitoring/scrub';

const dsn = import.meta.env.VITE_SENTRY_DSN;
Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
  tracesSampleRate: 0.1,
  dataCollection: sentryDataCollection,
  beforeSend: scrubEvent,
});

/** El nonce llega a la app por contexto: lo usan <Scripts>, <ScrollRestoration> y el script de tema. */
function NonceServerRouter(props: ComponentProps<typeof ServerRouter>) {
  return (
    <NonceProvider nonce={props.nonce}>
      <ServerRouter {...props} />
    </NonceProvider>
  );
}

const nonces = new WeakMap<Request, string>();

const sentryHandleRequest = Sentry.createSentryHandleRequest({
  ServerRouter: NonceServerRouter as typeof ServerRouter,
  renderToPipeableStream,
  createReadableStreamFromReadable,
  getNonce: ({ request }) => nonces.get(request),
});

/**
 * Cada documento SSR recibe un nonce nuevo y su cabecera CSP (ADR-0021).
 * En desarrollo no se aplica: Vite inyecta scripts inline para HMR.
 */
export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: AppLoadContext,
) {
  const nonce = randomBytes(16).toString('base64');
  nonces.set(request, nonce);

  if (import.meta.env.PROD) {
    responseHeaders.set(
      'Content-Security-Policy',
      cspFromEnv([`'nonce-${nonce}'`], {
        production: true,
        https: isHttpsRequest(request),
        privateArea: isPrivateAreaPath(new URL(request.url).pathname),
      }),
    );
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    responseHeaders.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );
  }

  return sentryHandleRequest(
    request,
    responseStatusCode,
    responseHeaders,
    routerContext,
    loadContext,
  );
}

/** Errores de loaders y del render en el servidor → Sentry (sin datos sensibles). */
export const handleError = Sentry.createSentryHandleError({ logErrors: true });
