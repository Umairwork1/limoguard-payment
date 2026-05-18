import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { AppModule } from '../src/app.module';

const expressApp = express();

let appReady: Promise<void> | null = null;

function initApp(): Promise<void> {
  if (appReady) return appReady;

  appReady = (async () => {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

    app.enableCors({
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');

    const config = new DocumentBuilder()
      .setTitle('MyFatoorah Recurring Payment API')
      .setDescription(
        'Test harness for all MyFatoorah recurring payment use cases: initiate, execute, get, resume, and cancel.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Payment Methods', 'Get available payment methods')
      .addTag('Recurring', 'Create, manage, and query recurring payments')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    await app.init();
  })();

  return appReady;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await initApp();
  expressApp(req as any, res as any);
}
