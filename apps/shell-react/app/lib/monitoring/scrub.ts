import {
  redactSensitive,
  SENSITIVE_HEADERS,
  stripQuery,
} from '@qolqa/contracts';
import type { ErrorEvent } from '@sentry/react-router';

/**
 * Sentry 11 recoge por defecto cuerpos, cabeceras, cookies, query strings y
 * variables locales. En una banca se restringe a lista blanca (ADR-0021).
 */
export const sentryDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: { allow: ['user-agent', 'content-type'] },
    response: false,
  },
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: true, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
};

/** Segunda barrera: aunque algo se colara, se limpia antes de salir del navegador o del servidor. */
export function scrubEvent<T extends ErrorEvent>(event: T): T {
  if (event.request) {
    if (event.request.url) event.request.url = stripQuery(event.request.url);
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
    for (const header of SENSITIVE_HEADERS)
      delete event.request.headers?.[header];
  }
  if (event.message) event.message = redactSensitive(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = redactSensitive(exception.value);
  }
  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (breadcrumb.message)
      breadcrumb.message = redactSensitive(breadcrumb.message);
    if (typeof breadcrumb.data?.['url'] === 'string')
      breadcrumb.data['url'] = stripQuery(breadcrumb.data['url']);
  }
  return event;
}
