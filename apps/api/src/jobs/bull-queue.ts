import { Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { JobHandler, JobQueue } from './job-queue';

/**
 * BullMQ-backed queue (used when REDIS_URL is set). Jobs are enqueued to Redis
 * and processed by Workers — out of band, retryable, and durable across
 * deploys. One Queue + Worker pair per job name.
 */
export class BullJobQueue implements JobQueue {
  readonly driver = 'bullmq';
  private readonly logger = new Logger(BullJobQueue.name);
  private readonly connection: { url: string };
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();

  constructor(redisUrl: string) {
    this.connection = { url: redisUrl };
  }

  private queueFor(name: string): Queue {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, { connection: this.connection });
      this.queues.set(name, queue);
    }
    return queue;
  }

  process<T>(name: string, handler: JobHandler<T>): void {
    this.queueFor(name);
    const worker = new Worker(
      name,
      async (job) => {
        await handler(job.data as T);
      },
      { connection: this.connection },
    );
    worker.on('failed', (job, err) =>
      this.logger.error(`Job ${name}#${job?.id} failed: ${err.message}`),
    );
    this.workers.set(name, worker);
  }

  async enqueue<T>(name: string, data: T): Promise<string> {
    const job = await this.queueFor(name).add(name, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    return String(job.id);
  }
}
