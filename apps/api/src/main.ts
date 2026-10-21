import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app/app.module';
import { SocketIoAdapter } from './common/socket-io.adapter';
import type { Env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const production = config.get('NODE_ENV', { infer: true }) === 'production';
  const webOrigin = config.get('WEB_ORIGIN', { infer: true });

  // Detrás del proxy de Render/Vercel: req.ip debe ser la IP real del cliente.
  app.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));

  // CSP estricta en producción. En desarrollo se desactiva para Swagger UI y Apollo Sandbox.
  app.use(helmet({ contentSecurityPolicy: production ? undefined : false }));
  app.use(cookieParser());
  app.enableCors({ origin: webOrigin, credentials: true });
  app.useWebSocketAdapter(new SocketIoAdapter(app, webOrigin));
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  if (!production) {
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
    );
    SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(document));
  }

  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0');
}

void bootstrap();
