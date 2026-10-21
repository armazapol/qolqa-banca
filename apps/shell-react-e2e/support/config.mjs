/**
 * Configuración compartida del entorno E2E (ADR-0022). Puertos propios para no
 * chocar con los servidores de desarrollo (3000, 4201, 5173).
 *
 * Las claves de abajo son SOLO de pruebas: protegen datos ficticios de una base
 * descartable y deben coincidir entre el seed y el BFF.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

export const PORTS = { edge: 4300, api: 3100, shell: 4302, stub: 3101 };
/** HTTPS como en Vercel: WebKit no acepta cookies `Secure`/`__Host-` sobre http://localhost. */
export const BASE_URL = `https://localhost:${PORTS.edge}`;
export const CERT_DIR = join(ROOT, 'apps/shell-react-e2e/.certs');

export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://qolqa:qolqa_dev_only@127.0.0.1:5434/qolqa_e2e?schema=public';

export const E2E_USERS_FILE = join(
  ROOT,
  'apps/shell-react-e2e/.e2e-users.json',
);
export const E2E_USER_COUNT = 150;

const testKey = (label) =>
  Buffer.from(`qolqa-e2e-${label}`.padEnd(32, '!')).toString('base64');

/** Variables del BFF durante las pruebas (sobrescriben apps/api/.env). */
export const API_ENV = {
  NODE_ENV: 'production',
  PORT: String(PORTS.api),
  DATABASE_URL: E2E_DATABASE_URL,
  WEB_ORIGIN: BASE_URL,
  TRUST_PROXY: '1',
  LOG_LEVEL: 'warn',
  JWT_ACCESS_SECRET: testKey('access'),
  JWT_MFA_SECRET: testKey('mfa'),
  CSRF_SECRET: testKey('csrf'),
  TOTP_ENCRYPTION_KEY: testKey('totp'),
  BCRP_BASE_URL: `http://localhost:${PORTS.stub}/bcrp`,
  // Vacío = Sentry desactivado: los errores provocados por las pruebas no se reportan.
  SENTRY_DSN: '',
};

/** Variables del build del shell para E2E. */
export const SHELL_BUILD_ENV = {
  // El WebSocket también pasa por el edge (wss://localhost:4300), igual de seguro que la página.
  VITE_WS_URL: BASE_URL,
  VITE_GA_MEASUREMENT_ID: 'G-E2ETEST01',
  VITE_SENTRY_DSN: '',
};

/** Tipo de cambio fijo que devuelve el BCRP simulado. */
export const FX = { buy: 3.411, sell: 3.425, date: '2026-10-20' };
