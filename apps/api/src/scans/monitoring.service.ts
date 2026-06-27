import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Store } from '../store/store.module';
import { ScanProcessor } from './scan.processor';

/**
 * Continuous monitoring. Security isn't a one-time state: new CVEs are published
 * daily against dependencies you already ship, and infra drifts. This service
 * periodically re-scans every connected project so findings stay current without
 * anyone pressing "scan". Off by default; set MONITOR_INTERVAL_HOURS to enable
 * (e.g. 24 for a daily recheck).
 */
@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitoringService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly store: Store,
    private readonly processor: ScanProcessor,
  ) {}

  onModuleInit() {
    const hours = Number(process.env.MONITOR_INTERVAL_HOURS) || 0;
    if (hours <= 0) return;
    this.timer = setInterval(() => {
      void this.runOnce().catch((e) =>
        this.logger.warn(`Monitoring sweep failed: ${(e as Error).message}`),
      );
    }, hours * 3_600_000);
    // Don't keep the process alive just for the timer.
    this.timer.unref?.();
    this.logger.log(`Continuous monitoring enabled: re-scan every ${hours}h`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Enqueue a fresh scan for every project that has at least one connection. */
  async runOnce(): Promise<number> {
    const projects = await this.store.listAllProjects();
    let enqueued = 0;
    for (const project of projects) {
      const connections = await this.store.listConnections(project.id);
      if (connections.length === 0) continue;
      const org = await this.store.getOrganization(project.orgId);
      const scan = await this.store.createScan({
        orgId: project.orgId,
        projectId: project.id,
        status: 'queued',
      });
      await this.processor.enqueue({
        scanId: scan.id,
        projectId: project.id,
        plan: org?.plan,
      });
      enqueued++;
    }
    if (enqueued > 0) this.logger.log(`Monitoring sweep enqueued ${enqueued} re-scan(s)`);
    return enqueued;
  }
}
