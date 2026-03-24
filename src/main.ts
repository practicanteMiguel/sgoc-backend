import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global para todas las rutas
  app.setGlobalPrefix('api/v1');

  // CORS — en producción restringir al dominio del frontend
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL
      : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validación global con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // elimina campos no declarados en el DTO
      forbidNonWhitelisted: true,// lanza error si llegan campos extra
      transform: true,           // transforma tipos automáticamente
    }),
  );

  // Filtro global de excepciones
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger — documentación de APIs
  const config = new DocumentBuilder()
    .setTitle('Gestión API')
    .setDescription('API de la plataforma de gestión')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Backend corriendo en: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs en:      http://localhost:${port}/api/docs`);
}
bootstrap();