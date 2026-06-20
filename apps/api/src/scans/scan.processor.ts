import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { exampleGraph, hasFeature, Plan, SystemGraph } from '@riscly/shared';
import { Store } from '../store/store.module';
import { AnalyzeService } from '../analyze/analyze.service';
import { ScannerService } from '../scanner/scanner.service';
import { JOB_QUEUE, JobQueue } from '../jobs/job-queue';
import { SecretBox } from '../crypto/secret-box';
import { isGithubAppConfigured, mintInstallationToken } from '../oauth/github-app';

export interface ScanJob {
  scanId: string;
  projectId: string;
  graph?: SystemGraph;
  /** The org's plan, so deep analysis (SCA / code audit) can be gated. */
  plan?: Plan;
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
    private readonly secrets: SecretBox,
    @Inject(JOB_QUEUE) private readonly queue: JobQueue,
  ) {}

  onModuleInit() {
    this.queue.process<ScanJob>('scan', (data) => this.handle(data));
  }

  enqueue(job: ScanJob): Promise<string> {
    return this.queue.enqueue('scan', job);
  }

  private handle(job: ScanJob): Promise<void> {
    // Custom span — links the scan work to the request trace when tracing is on,
    // and is a no-op otherwise.
    return trace
      .getTracer('riscly')
      .startActiveSpan('scan.run', async (span) => {
        span.setAttribute('scan.id', job.scanId);
        span.setAttribute('project.id', job.projectId);
        try {
          await this.runScan(job);
          span.setStatus({ code: SpanStatusCode.OK });
        } catch (err) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
        } finally {
          span.end();
        }
      });
  }

  private async runScan(job: ScanJob): Promise<void> {
    await this.store.updateScan(job.scanId, { status: 'running' });
    try {
      let graph = job.graph;
      if (!graph) {
        const connections = await this.store.listConnections(job.projectId);
        // Decrypt each connection's own token just-in-time, so every collector
        // authenticates to its provider with the right credentials.
        const tokens: Record<string, string> = {};
        for (const c of connections) {
          if (c.encryptedToken) {
            try {
              tokens[c.id] = this.secrets.decrypt(c.encryptedToken);
            } catch (err) {
              this.logger.warn(`Could not decrypt token for connection ${c.id}: ${(err as Error).message}`);
            }
            continue;
          }
          // GitHub App connections store no token — mint a short-lived
          // installation token from the App's private key at scan time.
          const installationId = c.metadata?.installationId;
          if (c.provider === 'github' && installationId && isGithubAppConfigured()) {
            try {
              tokens[c.id] = await mintInstallationToken(String(installationId));
            } catch (err) {
              this.logger.warn(`Could not mint installation token for connection ${c.id}: ${(err as Error).message}`);
            }
          }
        }
        const entitlements = job.plan
          ? {
              sca: hasFeature(job.plan, 'sca'),
              codeAudit: hasFeature(job.plan, 'sast'),
            }
          : undefined;
        graph = connections.length
          ? await this.scanner.scan(connections, { tokens, entitlements })
          : exampleGraph;
      }
      const analysis = this.analyze.reliability(graph);
      await this.store.updateScan(job.scanId, {
        status: 'succeeded',
        graph,
        reliabilityScore: analysis.score,
        findings: analysis.findings,
        recommendations: analysis.recommendations,
        finishedAt: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error(`Scan ${job.scanId} failed: ${(err as Error).message}`);
      await this.store.updateScan(job.scanId, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
      });
    }
  }
}
