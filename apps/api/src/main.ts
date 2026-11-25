import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';
import { AuditInterceptor } from './core/interceptors/audit.interceptor';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const logger = new Logger('RetailHubBootstrap');
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // 1. Global Route Prefix
  app.setGlobalPrefix('api/v1');

  // 2. Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-Id',
      'Accept',
    ],
    exposedHeaders: ['X-Correlation-Id'],
    credentials: true,
  });

  // 3. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 4. Global Exception Filter & Interceptors
  const allExceptionsFilter = app.get(AllExceptionsFilter);
  const transformInterceptor = app.get(TransformInterceptor);
  const auditInterceptor = app.get(AuditInterceptor);

  app.useGlobalFilters(allExceptionsFilter);
  app.useGlobalInterceptors(transformInterceptor, auditInterceptor);

  // 5. OpenAPI / Swagger Documentation at /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('RetailHub Enterprise Platform API')
    .setDescription(
      'High-Velocity Retail Operations Modular Monolith API (D-Mart / JioMart Model) — Core Infrastructure, RBAC, Server-Side Data Scoping, and Audit Pipeline.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT Bearer token issued by RetailHub Auth Service',
      },
      'JWT-Auth',
    )
    .addGlobalParameters({
      in: 'header',
      required: false,
      name: 'X-Correlation-Id',
      description: 'Optional UUID v4 correlation ID for request tracing',
      schema: {
        type: 'string',
        format: 'uuid',
      },
    })
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });

  // Enable graceful shutdown hooks for PrismaService
  app.enableShutdownHooks();

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port, '0.0.0.0');

  logger.log(
    `RetailHub Enterprise API running on http://localhost:${port}/api/v1`,
  );
  logger.log(
    `Swagger OpenAPI documentation mounted at http://localhost:${port}/api/docs`,
  );
}

void bootstrap();
