import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { exampleGraph, SystemGraph } from '@failsafe/shared';
import { Store } from '../store/store.module';
import { AnalyzeService } from '../analyze/analyze.service';
import { ScannerService } from '../scanner/scanner.service';
import { JOB_QUEUE, JobQueue } from '../jobs/job-queue';

export interface ScanJob {
  scanId: string;
  projectId: string;
  graph?: SystemGraph;
}

/**
 * The scan worker. Registers a `scan` job handler on the queue at startup and
 * performs the work: pick/build the graph (from an explicit graph, the
 * project's connections, or the demo graph), run the reliability engine, and
 * persist the result, moving the scan through queued → running → succeeded /
 * failed. With the inline queue this runs synchronously; with BullMQ it runs in
 * a worker process.
 */
@Injectable()
export class ScanProcessor implements OnModuleInit {
  private readonly logger = new Logger(ScanProcessor.name);

  constructor(
    private readonly store: Store,
    private readonly analyze: AnalyzeService,
    private readonly scanner: ScannerService,
    @Inject(JOB_QUEUE) private readonly queue: JobQueue,
  ) {}

  onModuleInit() {
    this.queue.process<ScanJob>('scan', (data) => this.handle(data));
  }

  enqueue(job: ScanJob): Promise<string> {
    return this.queue.enqueue('scan', job);
  }

  private async handle(job: ScanJob): Promise<void> {
    this.store.updateScan(job.scanId, { status: 'running' });
    try {
      let graph = job.graph;
      if (!graph) {
        const connections = this.store.listConnections(job.projectId);
        graph = connections.length
          ? await this.scanner.scan(connections)
          : exampleGraph;
      }
      const analysis = this.analyze.reliability(graph);
      this.store.updateScan(job.scanId, {
        status: 'succeeded',
        graph,
        reliabilityScore: analysis.score,
        findings: analysis.findings,
        recommendations: analysis.recommendations,
        finishedAt: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error(`Scan ${job.scanId} failed: ${(err as Error).message}`);
      this.store.updateScan(job.scanId, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
      });
    }
  }
}
