import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // HTTP security headers: XSS, clickjacking, MIME sniffing, etc.
  app.use(helmet());

  app.setGlobalPrefix('api/v1');

  const isProduction = process.env.NODE_ENV === 'production';

  app.enableCors({
    origin: isProduction
      ? (process.env.FRONTEND_URL ?? false)
      : [
          'http://localhost:3000',
          process.env.FRONTEND_NETWORK_URL ?? 'http://localhost:3000',
        ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Gestion API')
    .setDescription('API de la plataforma de gestion')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend corriendo en: http://localhost:${port}/api/v1`);
  console.log(`WebSocket en: ws://localhost:${port}/notifications`);
  console.log(`Swagger docs en: http://localhost:${port}/api/docs`);
}
bootstrap();
