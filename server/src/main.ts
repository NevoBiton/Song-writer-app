import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3001;
  const allowedOrigin =
    config.get<string>('ALLOWED_ORIGIN') ??
    (config.get<string>('NODE_ENV') !== 'production' ? 'http://localhost:5173' : '');

  // Security headers
  app.use(helmet());

  // CORS
  app.enableCors({ origin: allowedOrigin, credentials: true });

  // Global route prefix
  app.setGlobalPrefix('api');

  // DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // strip unknown fields
      forbidNonWhitelisted: false,
      transform: true,        // auto-transform payload types
    }),
  );

  // Swagger UI — available at /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('WordChord API')
    .setDescription('REST API for the WordChord chord notebook app')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  console.log(`🎵 WordChord API running on http://localhost:${port}`);
  console.log(`📖 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
