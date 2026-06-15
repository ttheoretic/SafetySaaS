import 'reflect-metadata';
import { startTracing } from './observability/tracing';

// Start tracing before anything else so instrumentation can patch modules.
startTracing('failsafe-api');

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // CORS: restrict to an allowlist when configured, otherwise allow all (dev).
  const origins = (process.env.CORS_ORIGINS ?? process.env.APP_URL ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const app = await NestFactory.create(AppModule, {
    cors: origins.length ? { origin: origins, credentials: true } : true,
  });
  // Capture the raw body for Stripe webhook signature verification.
  app.use('/api/billing/webhook', (req: any, _res: any, next: any) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c: string) => (data += c));
    req.on('end', () => {
      req.rawBody = Buffer.from(data, 'utf8');
      try { req.body = data ? JSON.parse(data) : {}; } catch { req.body = {}; }
      next();
    });
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  Logger.log(`FailSafe AI API listening on :${port}`, 'Bootstrap');
}

bootstrap();
