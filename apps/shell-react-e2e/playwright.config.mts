import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';
import { API_ENV, BASE_URL, PORTS } from './support/config.mjs';

/**
 * E2E contra los builds de producción (ADR-0022): BFF, shell SSR y remote,
 * detrás de un "edge" que imita a Vercel. `support/prepare.mjs` prepara la base
 * de datos y los builds antes de ejecutar Playwright.
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  fullyParallel: true,
  workers: process.env['CI'] ? 2 : 4,
  retries: process.env['CI'] ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    // Certificado autofirmado del edge local (solo pruebas).
    ignoreHTTPSErrors: true,
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      // BCRP simulado + reparto de usuarios + edge.
      command: 'node apps/shell-react-e2e/support/servers.mjs',
      url: `http://localhost:${PORTS.stub}/health`,
      cwd: workspaceRoot,
      reuseExistingServer: false,
    },
    {
      command: `node apps/shell-react-e2e/support/wait-for.mjs http://localhost:${PORTS.stub}/health && node apps/api/dist/main.js`,
      url: `http://localhost:${PORTS.api}/api/health`,
      cwd: workspaceRoot,
      env: API_ENV,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        'node ../../node_modules/@react-router/serve/dist/cli.js build/server/index.js',
      url: `http://localhost:${PORTS.shell}/`,
      cwd: `${workspaceRoot}/apps/shell-react`,
      // API_URL: el SSR (p. ej. /tipo-de-cambio) llama al BFF desde el servidor, no por el proxy.
      env: {
        NODE_ENV: 'production',
        PORT: String(PORTS.shell),
        API_URL: `http://localhost:${PORTS.api}/api`,
      },
      reuseExistingServer: false,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // El service worker no se registra con el certificado autofirmado sin esta opción (solo pruebas).
        launchOptions: { args: ['--ignore-certificate-errors'] },
      },
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // Móvil: solo los flujos marcados como @movil.
    { name: 'movil', use: { ...devices['Pixel 7'] }, grep: /@movil/ },
  ],
});
