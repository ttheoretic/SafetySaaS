import 'reflect-metadata';
import { startTracing } from './observability/tracing';

startTracing('failsafe-worker');

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Dedicated worker entrypoint.
 *
 * Boots the application context **without** an HTTP server, so the job
 * processors (e.g. ScanProcessor) register their BullMQ workers and consume
 * jobs from Redis. Run this as a separate deployment (`node dist/worker.js`)
 * alongside the API pods; both share the same modules and the same queue.
 *
 * With the inline queue (no REDIS_URL) this process has nothing to do — jobs
 * run in the API process itself — so it logs and stays idle.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();
  Logger.log(
    `FailSafe AI worker started (driver: ${process.env.REDIS_URL ? 'bullmq' : 'inline'})`,
    'Worker',
  );

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap();
