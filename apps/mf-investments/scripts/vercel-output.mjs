/**
 * Salida para `vercel deploy --prebuilt` del remote Angular (ADR-0023), con el
 * formato Build Output API v3: archivos estáticos + cabeceras de caché.
 *
 * - remoteEntry.json, importmap.json e index.html: siempre se revalidan; así un
 *   despliegue nuevo del remote llega al shell sin redesplegarlo.
 * - *.js: nombres con hash de contenido → caché inmutable de un año.
 *
 * Uso (tras `nx build mf-investments`): node apps/mf-investments/scripts/vercel-output.mjs
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../../..');
const BUILD = join(ROOT, 'dist/apps/mf-investments/browser');
const OUTPUT = join(import.meta.dirname, '../.vercel/output');

rmSync(OUTPUT, { recursive: true, force: true });
mkdirSync(OUTPUT, { recursive: true });
cpSync(BUILD, join(OUTPUT, 'static'), { recursive: true });

const config = {
  version: 3,
  routes: [
    {
      src: '^/(.*)$',
      headers: { 'X-Content-Type-Options': 'nosniff' },
      continue: true,
    },
    {
      src: '^/(.*)\\.js$',
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
      continue: true,
    },
    {
      src: '^/(remoteEntry\\.json|importmap\\.json|index\\.html)?$',
      headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
      continue: true,
    },
    { handle: 'filesystem' },
  ],
};
writeFileSync(
  join(OUTPUT, 'config.json'),
  `${JSON.stringify(config, null, 2)}\n`,
);
console.log(`✔ Remote listo para Vercel en ${OUTPUT}`);
