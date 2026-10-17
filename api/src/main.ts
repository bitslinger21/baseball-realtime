import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { installMlbRelay } from './providers/mlb/mlb-relay';

async function bootstrap() {
  // Before any module starts polling MLB.
  installMlbRelay();
  const app = await NestFactory.create(AppModule, {
    cors: true,
    logger: ['log', 'warn', 'error'],
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: ['http://localhost:5173'] });
  const doc = new DocumentBuilder()
    .setTitle('Baseball Realtime API')
    .setVersion('1.0.0')
    .build();
  const swagger = SwaggerModule.createDocument(app, doc);
  SwaggerModule.setup('/docs', app, swagger);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');

}
bootstrap();
