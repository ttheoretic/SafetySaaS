import { describe, it, expect, vi } from 'vitest';
import { MonitoringService } from './monitoring.service';
import type { Store } from '../store/store.module';
import type { ScanProcessor } from './scan.processor';

describe('MonitoringService.runOnce', () => {
  it('re-scans only projects that have connections', async () => {
    const projects = [
      { id: 'p1', orgId: 'o1' },
      { id: 'p2', orgId: 'o1' }, // no connections → skipped
    ];
    const store = {
      listAllProjects: vi.fn(async () => projects),
      listConnections: vi.fn(async (id: string) => (id === 'p1' ? [{ id: 'c1' }] : [])),
      getOrganization: vi.fn(async () => ({ id: 'o1', plan: 'growth' })),
      createScan: vi.fn(async (input: any) => ({ id: 's-' + input.projectId, ...input })),
    } as unknown as Store;
    const processor = { enqueue: vi.fn(async () => 'job') } as unknown as ScanProcessor;

    const svc = new MonitoringService(store, processor);
    const count = await svc.runOnce();

    expect(count).toBe(1);
    expect(processor.enqueue).toHaveBeenCalledTimes(1);
    expect(processor.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1', plan: 'growth' }),
    );
  });

  it('enqueues nothing when no project has connections', async () => {
    const store = {
      listAllProjects: vi.fn(async () => [{ id: 'p1', orgId: 'o1' }]),
      listConnections: vi.fn(async () => []),
      getOrganization: vi.fn(),
      createScan: vi.fn(),
    } as unknown as Store;
    const processor = { enqueue: vi.fn() } as unknown as ScanProcessor;

    expect(await new MonitoringService(store, processor).runOnce()).toBe(0);
    expect(processor.enqueue).not.toHaveBeenCalled();
  });
});
