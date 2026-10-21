import { redactSensitive, SENSITIVE_HEADERS } from '@qolqa/contracts';
import * as Sentry from '@sentry/nestjs';
import { existsSync } from 'node:fs';

/**
 * Debe importarse antes que cualquier otro módulo (ADR-0021). En local se lee
 * apps/api/.env aquí porque ConfigModule todavía no se ha cargado.
 */
for (const file of ['apps/api/.env', '.env']) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
    break;
  }
}

const dsn = process.env['SENTRY_DSN'];

// Sin DSN, Sentry queda desactivado: el BFF funciona igual.
Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env['SENTRY_ENVIRONMENT'] ?? process.env['NODE_ENV'],
  tracesSampleRate: 0.1,
  // Sentry 11 recoge por defecto cuerpos, cabeceras, cookies, variables de GraphQL,
  // datos de consultas SQL y variables locales: en un banco se restringe a lista blanca.
  dataCollection: {
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
  },
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;
      delete event.request.query_string;
      for (const header of SENSITIVE_HEADERS)
        delete event.request.headers?.[header];
    }
    for (const exception of event.exception?.values ?? []) {
      if (exception.value) exception.value = redactSensitive(exception.value);
    }
    if (event.message) event.message = redactSensitive(event.message);
    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.message)
      breadcrumb.message = redactSensitive(breadcrumb.message);
    return breadcrumb;
  },
});
