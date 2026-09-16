import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { json, urlencoded } from 'express';

async function bootstrap() {
  // ── Falla rápido si van a producción con secretos de ejemplo ──
  const INSECURE_DEFAULTS = ['supersecreto_cambia_esto_en_produccion', 'otro_secreto_diferente_para_refresh'];
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || INSECURE_DEFAULTS.includes(process.env.JWT_SECRET)) {
      throw new Error('JWT_SECRET no está configurado con un valor seguro para producción. Define una variable de entorno JWT_SECRET real.');
    }
    if (!process.env.JWT_REFRESH_SECRET || INSECURE_DEFAULTS.includes(process.env.JWT_REFRESH_SECRET)) {
      throw new Error('JWT_REFRESH_SECRET no está configurado con un valor seguro para producción.');
    }
  }

  const app = await NestFactory.create(AppModule);

  // ── Body size ──────────────────────────────────────────
  // El editor 3D de personalización envía imágenes y la vista previa
  // del render como base64 dentro del JSON; el límite por defecto de
  // Express (100kb) es insuficiente y causaba "request entity too large".
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));

  // ── Seguridad ──────────────────────────────────────────
  app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ── Rendimiento ────────────────────────────────────────
  app.use(compression());

  // ── Validación global de DTOs ──────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // Strip propiedades no declaradas en DTO
      forbidNonWhitelisted: true,  // Error si se envían props no permitidas
      transform: true,             // Auto-transform payload a tipos TS
    }),
  );

  // ── Prefijo global ─────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Swagger (docs en /docs) ────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Dream Life API')
      .setDescription('API REST para la plataforma Dream Life')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    console.log(`📚 Swagger disponible en http://localhost:${process.env.PORT || 3001}/docs`);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 API corriendo en http://localhost:${port}/api/v1`);
}

bootstrap();
