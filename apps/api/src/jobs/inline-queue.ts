import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { JobHandler, JobQueue } from './job-queue';

/**
 * In-process job queue used when no REDIS_URL is configured. Runs the
 * registered handler immediately and awaits it, so a single-process dev/test
 * deployment behaves correctly (the job is done by the time `enqueue` resolves)
 * without requiring Redis. In production the BullMQ driver runs jobs out of
 * band in worker processes.
 */
export class InlineJobQueue implements JobQueue {
  readonly driver = 'inline';
  private readonly logger = new Logger(InlineJobQueue.name);
  private readonly handlers = new Map<string, JobHandler<any>>();

  process<T>(name: string, handler: JobHandler<T>): void {
    this.handlers.set(name, handler as JobHandler<any>);
  }

  async enqueue<T>(name: string, data: T): Promise<string> {
    const id = randomUUID();
    const handler = this.handlers.get(name);
    if (!handler) {
      this.logger.warn(`No handler registered for job "${name}"`);
      return id;
    }
    try {
      await handler(data);
    } catch (err) {
      this.logger.error(`Job "${name}" failed: ${(err as Error).message}`);
    }
    return id;
  }
}
