import { describe, it, expect, vi } from 'vitest';
import { resilientFetch, mapWithConcurrency, withTimeout } from './collector';

describe('mapWithConcurrency', () => {
  it('preserves order and never exceeds the concurrency limit', async () => {
    let inFlight = 0;
    let peak = 0;
    const items = Array.from({ length: 20 }, (_, i) => i);
    const out = await mapWithConcurrency(items, 4, async (n) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      return n * 2;
    });
    expect(out).toEqual(items.map((n) => n * 2));
    expect(peak).toBeLessThanOrEqual(4);
  });

  it('handles an empty list', async () => {
    expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
  });
});

describe('withTimeout', () => {
  it('returns the value when it settles in time', async () => {
    const v = await withTimeout(Promise.resolve('ok'), 1000, () => 'late');
    expect(v).toBe('ok');
  });

  it('falls back when the work exceeds the timeout', async () => {
    const slow = new Promise<string>((r) => setTimeout(() => r('done'), 50));
    const v = await withTimeout(slow, 10, () => 'timed-out');
    expect(v).toBe('timed-out');
  });

  it('falls back on rejection', async () => {
    const v = await withTimeout(Promise.reject(new Error('x')), 1000, () => 'fallback');
    expect(v).toBe('fallback');
  });
});

describe('resilientFetch', () => {
  it('retries once on a 5xx then succeeds', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return { ok: calls > 1, status: calls > 1 ? 200 : 503 } as Response;
    }) as unknown as typeof fetch;

    const res = await resilientFetch(fetchImpl, 'https://x', {}, { retries: 1 });
    expect(calls).toBe(2);
    expect(res.ok).toBe(true);
  });

  it('retries on a thrown network error then rethrows when exhausted', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('network down'); }) as unknown as typeof fetch;
    await expect(resilientFetch(fetchImpl, 'https://x', {}, { retries: 1 })).rejects.toThrow('network down');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry a normal ok response', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 } as Response)) as unknown as typeof fetch;
    const res = await resilientFetch(fetchImpl, 'https://x');
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
