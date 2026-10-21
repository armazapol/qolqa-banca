import { z } from 'zod';

const secretKey = z
  .string()
  .refine(
    (value) => Buffer.from(value, 'base64').length === 32,
    'Debe ser base64 de 32 bytes',
  );

/** Variables de entorno validadas al arrancar: si falta algo, el BFF no inicia. */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.url(),
  WEB_ORIGIN: z.url(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  JWT_ACCESS_SECRET: secretKey,
  JWT_MFA_SECRET: secretKey,
  CSRF_SECRET: secretKey,
  TOTP_ENCRYPTION_KEY: secretKey,
  // Vacío = desactivado (así se puede copiar .env.example tal cual).
  SENTRY_DSN: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.url().optional(),
  ),
  SENTRY_ENVIRONMENT: z.string().optional(),
  BCRP_BASE_URL: z
    .url()
    .default('https://estadisticas.bcrp.gob.pe/estadisticas/series/api'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Variables de entorno inválidas:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
