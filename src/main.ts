import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { UPLOAD_URL_PREFIX } from './uploads/uploads.service';
import { swaggerBasicAuth } from './common/swagger-basic-auth';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  // CORS first: Express runs middleware in registration order, so anything
  // mounted above this — including the static handler below — would answer
  // without an Access-Control-Allow-Origin header. That is invisible for an
  // <img>, which loads cross-origin regardless, but it breaks fetch() and
  // anything that needs the response readable from the storefront's origin.
  app.enableCors({
    origin: config.getOrThrow<string[]>('app.corsOrigins'),
    credentials: true,
  });

  // Legacy local media. New uploads go to Cloudinary, but `/uploads/...` URLs
  // were frozen onto order snapshots (`Order.items[].image`) before the move,
  // and those must keep resolving — an order is a historical record.
  app.useStaticAssets(
    resolve(process.cwd(), config.getOrThrow<string>('app.uploadDir')),
    {
      prefix: `${UPLOAD_URL_PREFIX}/`,
      maxAge: '30d',
      index: false,
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Unguarded, Swagger hands out the whole admin API surface for free. Rather
  // than fall back to a guessable default (the mistake the JWT secrets make
  // above), a missing credential just leaves the docs unmounted.
  const swaggerUser = config.get<string>('app.swagger.user');
  const swaggerPassword = config.get<string>('app.swagger.password');

  if (swaggerUser && swaggerPassword) {
    app.use(
      ['/api/docs', '/api/docs-json', '/api/docs-yaml'],
      swaggerBasicAuth(swaggerUser, swaggerPassword),
    );

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Versa Collections API')
      .setDescription(
        'Clothing e-commerce backend. Money is expressed in minor units (integer paisa) throughout.',
      )
      .setVersion('0.1.0')
      .addCookieAuth('vc_access')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  } else {
    logger.warn(
      'SWAGGER_USER / SWAGGER_PASSWORD not set — /api/docs is disabled.',
    );
  }

  const port = config.getOrThrow<number>('app.port');
  await app.listen(port);

  logger.log(`Versa Collections API listening on http://localhost:${port}/api`);
  if (swaggerUser && swaggerPassword) {
    logger.log(
      `Swagger available at http://localhost:${port}/api/docs (Basic Auth required)`,
    );
  }
}

void bootstrap();
