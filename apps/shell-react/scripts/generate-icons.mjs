/**
 * Genera los iconos de la PWA a partir del isotipo (la qolqa del logo).
 * Uso: node apps/shell-react/scripts/generate-icons.mjs
 * Se renderiza el SVG con Chromium (Playwright) para no añadir dependencias nativas.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '../public/icons');
mkdirSync(out, { recursive: true });

const BRAND = '#0B4F5C';
const GOLD = '#E0A526';

/** padding: margen para iconos "maskable" (zona segura del 80 %). rounded: esquinas redondeadas. */
function svg({ padding = 0, rounded = true } = {}) {
  const inner = 32 - padding * 2;
  const scale = inner / 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="${rounded ? 7 : 0}" fill="${BRAND}"/>
  <g transform="translate(${padding} ${padding}) scale(${scale})">
    <path d="M7 15 16 7l9 8z" fill="${GOLD}"/>
    <rect x="9" y="15" width="14" height="10" rx="2" fill="#fff"/>
    <rect x="14" y="19" width="4" height="6" rx="1" fill="${BRAND}"/>
  </g>
</svg>`;
}

const icons = [
  { file: 'icon-192.png', size: 192, svg: svg() },
  { file: 'icon-512.png', size: 512, svg: svg() },
  {
    file: 'icon-maskable-512.png',
    size: 512,
    svg: svg({ padding: 4, rounded: false }),
  },
  {
    file: 'apple-touch-icon.png',
    size: 180,
    svg: svg({ padding: 2, rounded: false }),
  },
  { file: 'favicon-32.png', size: 32, svg: svg() },
];

writeFileSync(join(out, 'favicon.svg'), svg());

const browser = await chromium.launch();
const page = await browser.newPage();
for (const icon of icons) {
  await page.setViewportSize({ width: icon.size, height: icon.size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${icon.svg}`,
  );
  await page.screenshot({ path: join(out, icon.file), omitBackground: true });
  console.log(`✔ ${icon.file}`);
}
await browser.close();
