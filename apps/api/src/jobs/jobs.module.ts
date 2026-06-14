import { Global, Logger, Module } from '@nestjs/common';
import { JOB_QUEUE, JobQueue } from './job-queue';
import { InlineJobQueue } from './inline-queue';
import { BullJobQueue } from './bull-queue';

/**
 * Provides the job queue. BullMQ (Redis) when REDIS_URL is set, otherwise the
 * in-process inline queue so the API runs and is testable without Redis.
 */
@Global()
@Module({
  providers: [
    {
      provide: JOB_QUEUE,
      useFactory: (): JobQueue => {
        const url = process.env.REDIS_URL;
        if (url) {
          Logger.log('Jobs: BullMQ (Redis) queue active.', 'JobsModule');
          return new BullJobQueue(url);
        }
        Logger.log('Jobs: no REDIS_URL — inline queue.', 'JobsModule');
        return new InlineJobQueue();
      },
    },
  ],
  exports: [JOB_QUEUE],
})
export class JobsModule {}
