import { Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { JobHandler, JobQueue } from './job-queue';

/** Hard cap on a single job. Past this it fails (and BullMQ retries) rather than
 *  staying "active" forever and wedging the worker. */
const JOB_TIMEOUT_MS = Number(process.env.JOB_TIMEOUT_MS) || 300_000;
/** Jobs processed concurrently per worker. */
const WORKER_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 4;

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
        // Race the handler against a hard timeout so a stuck job fails and is
        // retried instead of holding the worker slot indefinitely.
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`job timed out after ${JOB_TIMEOUT_MS}ms`)),
            JOB_TIMEOUT_MS,
          );
        });
        try {
          await Promise.race([handler(job.data as T), timeout]);
        } finally {
          if (timer) clearTimeout(timer);
        }
      },
      { connection: this.connection, concurrency: WORKER_CONCURRENCY },
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
