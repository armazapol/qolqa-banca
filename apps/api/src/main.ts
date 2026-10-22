// Sentry debe cargarse antes que NestJS para instrumentar los módulos (ADR-0021).
import './instrument';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { Logger } from 'nestjs-pino';
import { writeFileSync } from 'node:fs';
import { AppModule } from './app/app.module';
import { createOriginMatcher } from './common/security/origins';
import { SocketIoAdapter } from './common/socket-io.adapter';
import type { Env } from './config/env';

/** `node main.js --emit-openapi <ruta>` escribe el contrato OpenAPI y termina. */
const OPENAPI_FLAG = '--emit-openapi';

function buildOpenApi(app: INestApplication): OpenAPIObject {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Qolqa BFF')
      .setDescription(
        'API REST de Qolqa Banca Digital (las consultas de lectura van por GraphQL)',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
    {
      // authLogin, transfersCreate, fxQuote…: nombres legibles para los hooks que genera Orval.
      operationIdFactory: (controller, method) =>
        controller
          .replace(/Controller$/, '')
          .replace(/^./, (c) => c.toLowerCase()) +
        method.replace(/^./, (c) => c.toUpperCase()),
    },
  );
  return cleanupOpenApiDoc(document);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const production = config.get('NODE_ENV', { infer: true }) === 'production';
  const isAllowedOrigin = createOriginMatcher(
    config.get('WEB_ORIGIN', { infer: true }),
    config.get('WEB_ORIGIN_PREVIEW', { infer: true }),
  );

  // Detrás del proxy de Render/Vercel: req.ip debe ser la IP real del cliente.
  app.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));

  // CSP estricta en producción. En desarrollo se desactiva para Swagger UI y Apollo Sandbox.
  app.use(helmet({ contentSecurityPolicy: production ? undefined : false }));
  app.use(cookieParser());
  app.enableCors({
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    credentials: true,
  });
  app.useWebSocketAdapter(new SocketIoAdapter(app, isAllowedOrigin));
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  // Sin app.init(): no se conecta a la base de datos ni abre el puerto.
  const openApiIndex = process.argv.indexOf(OPENAPI_FLAG);
  if (openApiIndex !== -1) {
    const target = process.argv[openApiIndex + 1] ?? 'openapi.json';
    writeFileSync(target, `${JSON.stringify(buildOpenApi(app), null, 2)}\n`);
    await app.close();
    return;
  }

  if (!production) {
    SwaggerModule.setup('api/docs', app, buildOpenApi(app));
  }

  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0');
}

void bootstrap();
