import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { AccountsModule } from '../accounts/accounts.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { depthLimit } from '../common/graphql/depth-limit';
import { SecurityModule } from '../common/security/security.module';
import { AppThrottlerGuard } from '../common/throttler.guard';
import { type Env, validateEnv } from '../config/env';
import { FxModule } from '../fx/fx.module';
import { HealthController } from '../health/health.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TransfersModule } from '../transfers/transfers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // Funciona tanto ejecutando desde la raíz del monorepo como desde apps/api.
      envFilePath: ['apps/api/.env', '.env'],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          genReqId: (req) =>
            (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
          // Nunca se escriben credenciales ni tokens en los logs (ADR-0018).
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers["x-csrf-token"]',
              'res.headers["set-cookie"]',
            ],
            censor: '[REDACTED]',
          },
          autoLogging: { ignore: (req) => req.url === '/api/health' },
          transport:
            config.get('NODE_ENV', { infer: true }) === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const production =
          config.get('NODE_ENV', { infer: true }) === 'production';
        return {
          path: '/api/graphql',
          // En desarrollo se escribe el esquema para GraphQL Codegen del front.
          autoSchemaFile: production
            ? true
            : join(process.cwd(), 'apps/api/schema.graphql'),
          sortSchema: true,
          introspection: !production,
          playground: false,
          validationRules: [depthLimit(6)],
          context: ({ req, res }: { req: Request; res: Response }) => ({
            req,
            res,
          }),
        };
      },
    }),
    PrismaModule,
    SecurityModule,
    AuditModule,
    AuthModule,
    AccountsModule,
    TransfersModule,
    NotificationsModule,
    FxModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
})
export class AppModule {}
