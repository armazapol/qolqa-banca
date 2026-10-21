/**
 * CSP de las páginas prerenderizadas (ADR-0021).
 * Sin servidor no hay nonce: se calcula el SHA-256 de cada script inline del
 * HTML generado y se escribe build/csp-static.json { "/ruta": "política" }.
 * En el despliegue (Fase 6) esas políticas se envían como cabecera por ruta.
 *
 * Uso: tsx scripts/csp-static.ts (después de `react-router build`).
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { buildCsp } from '../app/lib/csp/policy';

const CLIENT_DIR = join(import.meta.dirname, '../build/client');
const OUTPUT = join(import.meta.dirname, '../build/csp-static.json');
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === 'assets' ? [] : htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });
}

/** build/client/legal/cookies/index.html → /legal/cookies */
function routeOf(file: string): string {
  const route = relative(CLIENT_DIR, file)
    .split(sep)
    .join('/')
    .replace(/(^|\/)index\.html$/, '');
  return `/${route}`;
}

export function inlineScriptHashes(html: string): string[] {
  return [...html.matchAll(INLINE_SCRIPT)]
    .map((match) => match[1] ?? '')
    .filter((content) => content.trim().length > 0)
    .map(
      (content) =>
        `'sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}'`,
    );
}

const policies: Record<string, string> = {};
for (const file of htmlFiles(CLIENT_DIR)) {
  const hashes = inlineScriptHashes(readFileSync(file, 'utf8'));
  policies[routeOf(file)] = buildCsp({
    scriptTokens: [...new Set(hashes)],
    wsOrigin: process.env['VITE_WS_URL'],
    sentryDsn: process.env['VITE_SENTRY_DSN'],
    analytics: Boolean(process.env['VITE_GA_MEASUREMENT_ID']),
    // Las páginas estáticas siempre se sirven por HTTPS (Vercel; E2E también).
    upgradeInsecure: true,
  });
  console.log(`✔ ${routeOf(file)}: ${hashes.length} scripts inline con hash`);
}

writeFileSync(OUTPUT, `${JSON.stringify(policies, null, 2)}\n`);
