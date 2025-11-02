import { NestFactory } from '@nestjs/core';
import express from 'express';
import { AppModule } from '../app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { INestApplication } from '@nestjs/common';
import { generateSpec, serveSpec } from '../utils/openapi';

const SPEC_SERVE_PATH = 'api';

const expressApp = express();

export function getExpress(): express.Express {
  return expressApp;
}

export async function initNestApp(): Promise<INestApplication> {
  return await NestFactory.create(AppModule, new ExpressAdapter(getExpress()));
}

export async function bootstrapApp(): Promise<INestApplication> {
  const app: INestApplication = await initNestApp();
  app.enableCors({
    origin: '*', // TODO: Set this properly before shipping to production
  });
  const spec = generateSpec(app);
  serveSpec(app, SPEC_SERVE_PATH, spec);

  return app.init();
}
