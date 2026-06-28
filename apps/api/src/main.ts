import 'reflect-metadata';
import { startTracing } from './observability/tracing';

// Never let a transient client/exporter socket reset crash the server.
process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
  if (err?.code === 'ECONNRESET' || err?.code === 'EPIPE') {
    // benign: a client disconnected or a downstream socket reset
    return;
  }
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

// Start tracing before anything else so instrumentation can patch modules.
startTracing('riscly-api');

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

async function bootstrap() {
  // CORS: restrict to an allowlist when configured, otherwise allow all (dev).
  const origins = (process.env.CORS_ORIGINS ?? process.env.APP_URL ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const app = await NestFactory.create(AppModule, {
    cors: origins.length ? { origin: origins, credentials: true } : true,
  });

  // Baseline security headers (JSON API; no helmet dependency needed).
  app.getHttpAdapter().getInstance()?.disable?.('x-powered-by');
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }
    next();
  });

  // Capture the raw body for Stripe webhook signature verification.
  app.use('/api/billing/webhook', (req: any, _res: any, next: any) => {
    if (req.method !== 'POST') return next();
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c: string) => (data += c));
    req.on('end', () => {
      req.rawBody = Buffer.from(data, 'utf8');
      try { req.body = data ? JSON.parse(data) : {}; } catch { req.body = {}; }
      next();
    });
    req.on('error', () => next());
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());

  // Hosts like Render/Railway/Fly inject the port via $PORT; honor it first.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`Riscly API listening on :${port}`, 'Bootstrap');
}

bootstrap();
