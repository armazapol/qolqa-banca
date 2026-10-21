import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// En local las variables vienen de apps/api/.env; en CI/producción, del entorno.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'] ?? '',
  },
});
