import { describe, it, expect, vi } from 'vitest';
import { resilientFetch } from './collector';

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
