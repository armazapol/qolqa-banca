/**
 * Completa la salida de `vercel build` (.vercel/output/config.json) antes de
 * `vercel deploy --prebuilt` (ADR-0023):
 * - Rewrites al mismo origen: /api/* → BFF en Render y /mf/investments/* →
 *   proyecto de Vercel del remote Angular (ADR-0019, ADR-0020).
 * - CSP por hashes y cabeceras de seguridad de las páginas prerenderizadas, que
 *   Vercel sirve como archivos estáticos sin pasar por entry.server (ADR-0021).
 *
 * Los destinos llegan por entorno: en los previews de un PR, INVESTMENTS_ORIGIN
 * apunta al preview del remote de ese mismo PR.
 *
 * Uso: API_ORIGIN=https://… INVESTMENTS_ORIGIN=https://… tsx scripts/vercel-output.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SECURITY_HEADERS } from '../app/lib/csp/policy';

const ROOT = join(import.meta.dirname, '..');
const CONFIG = join(ROOT, '.vercel/output/config.json');
const CSP_STATIC = join(ROOT, 'build/csp-static.json');

interface Route {
  src?: string;
  dest?: string;
  headers?: Record<string, string>;
  continue?: boolean;
  handle?: string;
}

function originFromEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable ${name}`);
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error(`${name} debe usar https`);
  return url.origin;
}

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const apiOrigin = originFromEnv('API_ORIGIN');
const investmentsOrigin = originFromEnv('INVESTMENTS_ORIGIN');
const policies = JSON.parse(readFileSync(CSP_STATIC, 'utf8')) as Record<
  string,
  string
>;

const staticHeaders: Route[] = Object.entries(policies).map(([path, csp]) => ({
  src: path === '/' ? '^/$' : `^${escapeRegExp(path)}/?$`,
  headers: { 'Content-Security-Policy': csp, ...SECURITY_HEADERS },
  continue: true,
}));

const rewrites: Route[] = [
  { src: '^/api/(.*)$', dest: `${apiOrigin}/api/$1` },
  { src: '^/mf/investments/(.*)$', dest: `${investmentsOrigin}/$1` },
];

const config = JSON.parse(readFileSync(CONFIG, 'utf8')) as {
  routes?: Route[];
};
// Delante de las rutas de Vercel: las cabeceras continúan y los rewrites terminan.
config.routes = [...staticHeaders, ...rewrites, ...(config.routes ?? [])];
writeFileSync(CONFIG, `${JSON.stringify(config, null, 2)}\n`);

console.log(
  `✔ ${staticHeaders.length} páginas con CSP · /api → ${apiOrigin} · /mf/investments → ${investmentsOrigin}`,
);
