import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap(): Promise<void> {
  const logger = new Logger('ResortOS_Core');
  const app = await NestFactory.create(AppModule);

  // 1. SÉCURITÉ : Protection contre les vulnérabilités web courantes
  app.use(helmet());
  app.enableCors();
  app.use(cookieParser());

  // 2. VALIDATION : Transformation automatique des payloads en DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 3. PREFIXE & VERSIONING
  app.setGlobalPrefix('api/v1');

  // 4. DOCUMENTATION (Swagger) : Indispensable pour la perfection
  const config = new DocumentBuilder()
    .setTitle('ResortOS ERP API')
    .setDescription(
      "L'API centrale de gestion pour les complexes hôteliers de luxe.",
    )
    .setVersion('1.0')
    .addTag('PMS', 'Gestion des chambres et réservations')
    .addTag('HR', 'Gestion du personnel et pointage')
    .addTag('Parking', 'Logistique et entrées véhicules')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`----------------------------------------------------------`);
  logger.log(`🚀 ResortOS Backend : http://localhost:${port}/api/v1`);
  logger.log(`📚 Documentation Swagger : http://localhost:${port}/api/v1/docs`);
  logger.log(`🛡️  Sécurité Helmet : ACTIVÉE`);
  logger.log(`📊 Mode Performance : BOOST (Redis Ready)`);
  logger.log(`----------------------------------------------------------`);
}

bootstrap();
