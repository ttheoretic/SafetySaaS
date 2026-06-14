import { describe, it, expect } from 'vitest';
import { InlineJobQueue } from './inline-queue';

describe('InlineJobQueue', () => {
  it('runs the registered handler and awaits completion', async () => {
    const queue = new InlineJobQueue();
    const seen: number[] = [];
    queue.process<{ n: number }>('double', async (data) => {
      seen.push(data.n * 2);
    });
    const id = await queue.enqueue('double', { n: 21 });
    expect(typeof id).toBe('string');
    expect(seen).toEqual([42]); // done synchronously by the time enqueue resolves
  });

  it('does not throw when no handler is registered', async () => {
    const queue = new InlineJobQueue();
    await expect(queue.enqueue('missing', {})).resolves.toBeTypeOf('string');
  });

  it('swallows handler errors so a bad job never crashes the enqueuer', async () => {
    const queue = new InlineJobQueue();
    queue.process('boom', async () => {
      throw new Error('kaboom');
    });
    await expect(queue.enqueue('boom', {})).resolves.toBeDefined();
  });
});
