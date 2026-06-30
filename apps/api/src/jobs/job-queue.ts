/** DI token + interface for the background job queue. */

export const JOB_QUEUE = Symbol('JOB_QUEUE');

export type JobHandler<T = unknown> = (data: T) => Promise<void>;

export interface QueueCounts {
  waiting: number;
  active: number;
  failed: number;
  completed: number;
  delayed: number;
}

export interface JobQueue {
  readonly driver: string;
  /** Register the processor for a job type. Call once at startup. */
  process<T>(name: string, handler: JobHandler<T>): void;
  /** Enqueue a job. Resolves to the job id. */
  enqueue<T>(name: string, data: T): Promise<string>;
  /** Aggregate job counts for the admin console; null when not applicable
   *  (e.g. the inline queue, which keeps no backlog). */
  counts?(): Promise<QueueCounts | null>;
}
