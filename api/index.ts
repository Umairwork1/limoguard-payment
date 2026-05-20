import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { AppModule } from '../src/app.module';

const expressApp = express();

expressApp.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

let appReady: Promise<void> | null = null;

function initApp(): Promise<void> {
  if (appReady) return appReady;

  appReady = (async () => {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

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
