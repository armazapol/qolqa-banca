/**
 * Preparación E2E (ADR-0022), antes de Playwright:
 * 1. Base de datos `qolqa_e2e` (separada de la de desarrollo): migraciones + seed
 *    con usuarios exclusivos de prueba → .e2e-users.json
 * 2. Builds de producción: BFF, remote Angular y shell con variables de prueba.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import pg from 'pg';
import {
  API_ENV,
  CERT_DIR,
  E2E_DATABASE_URL,
  E2E_USER_COUNT,
  E2E_USERS_FILE,
  ROOT,
  SHELL_BUILD_ENV,
} from './config.mjs';

const run = (command, env = {}, cwd = ROOT) =>
  execSync(command, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });

// 0. Certificado autofirmado para https://localhost (solo pruebas, ignorado por git).
if (!existsSync(`${CERT_DIR}/cert.pem`)) {
  mkdirSync(CERT_DIR, { recursive: true });
  // Configuración mínima propia: no depende de OPENSSL_CONF del sistema (puede apuntar a un archivo inexistente).
  writeFileSync(
    `${CERT_DIR}/openssl.cnf`,
    '[req]\ndistinguished_name = dn\n[dn]\n',
  );
  run(
    `openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj "/CN=localhost" ` +
      `-config "${CERT_DIR}/openssl.cnf" ` +
      `-addext "subjectAltName=DNS:localhost,IP:127.0.0.1" ` +
      `-keyout "${CERT_DIR}/key.pem" -out "${CERT_DIR}/cert.pem"`,
  );
}

// 1. Base de datos E2E (se crea si no existe; nunca se toca la de desarrollo).
const url = new URL(E2E_DATABASE_URL);
const dbName = url.pathname.slice(1);
url.pathname = '/postgres';
const admin = new pg.Client({ connectionString: url.toString() });
await admin.connect();
const exists = await admin.query(
  'SELECT 1 FROM pg_database WHERE datname = $1',
  [dbName],
);
if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${dbName}"`);
await admin.end();

const dbEnv = {
  DATABASE_URL: E2E_DATABASE_URL,
  TOTP_ENCRYPTION_KEY: API_ENV.TOTP_ENCRYPTION_KEY,
};
run('pnpm exec prisma migrate deploy', dbEnv, `${ROOT}/apps/api`);
run(
  'pnpm exec tsx prisma/seed.ts',
  {
    ...dbEnv,
    SEED_E2E_USERS: String(E2E_USER_COUNT),
    SEED_E2E_OUTPUT: E2E_USERS_FILE,
  },
  `${ROOT}/apps/api`,
);

// 2. Builds. Las variables del shell forman parte de las entradas de caché de Nx.
if (!process.env.E2E_SKIP_BUILD) {
  run('pnpm nx run-many -t build -p api,mf-investments --outputStyle=static');
  run('pnpm nx run shell-react:build --outputStyle=static', SHELL_BUILD_ENV);
}
