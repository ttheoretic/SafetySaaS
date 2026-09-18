import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Module,
  Post,
  Req,
} from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import type { Request } from 'express';
import {
  buildSystemGraph,
  reliabilityScore,
  riskPosture,
  securitySimulation,
  type Finding,
  type RiskPosture,
  type SystemGraph,
} from '@riscly/shared';
import { Public } from '../auth/auth-context';
import { ScannerModule } from '../scanner/scanner.module';
import { GithubCollector } from '../scanner/collectors/github.collector';
import type { ConnectionRecord } from '../store/store.module';
import { parseRepoRef } from './repo-ref';

/** How many previews one IP may start, and over what window. */
const MAX_PER_WINDOW = Number(process.env.PREVIEW_LIMIT_PER_HOUR ?? 8);
const WINDOW_MS = 60 * 60_000;
/**
 * Optional scopeless GitHub token, used only to raise the preview's rate limit.
 * It must have no scopes: that keeps private repositories unreachable even if
 * the value leaks, and the preview's promise ("public repositories only") is
 * then enforced by GitHub rather than by us.
 */
const PREVIEW_TOKEN = process.env.PREVIEW_GITHUB_TOKEN?.trim() || undefined;

/** Repeat visits to the same repo are served from memory rather than re-fetched. */
const CACHE_TTL_MS = 10 * 60_000;
const CACHE_MAX = 200;

/** What an anonymous visitor gets back: the architecture, and nothing else. */
export interface PreviewResult {
  repo: string;
  /** Topology only — no findings, no code, no dependency detail. */
  graph: SystemGraph;
  /**
   * The risk posture we can honestly derive from architecture alone: scores and
   * counts, never a finding's title. Two of the five dimensions come back
   * unmeasured, which is the point — they need the repository connected.
   */
  posture: RiskPosture;
  /** Frameworks/providers detected, for the "what we found" strip. */
  detected: string[];
  scannedAt: string;
}

/**
 * The public preview.
 *
 * A visitor can map a public repository's architecture without an account,
 * because "sign up, then pay, then find out whether it works" is a bad trade to
 * ask of someone who has not seen anything yet. Everything past the map —
 * the risks themselves, fixes, simulations — stays behind sign-up.
 *
 * Constraints that make an unauthenticated scanner safe to expose:
 *  - the only input is a strict `owner/name` on github.com (see repo-ref.ts);
 *  - deep analysis (SCA/SAST) is switched off explicitly, so a preview is
 *    topology-only whether or not a token is configured;
 *  - the optional PREVIEW_GITHUB_TOKEN must be a *scopeless* token: GitHub then
 *    still refuses every private repository, so "public repositories only" is
 *    enforced by GitHub rather than by our code;
 *  - results are capped per IP and cached, so it cannot be used as a free
 *    scanning proxy or to burn our GitHub rate limit;
 *  - the response is rebuilt field by field, never spread from the scan.
 */
@Injectable()
export class PreviewService {
  private readonly logger = new Logger(PreviewService.name);
  private readonly hits = new Map<string, number[]>();
  private readonly cache = new Map<string, { at: number; result: PreviewResult }>();

  constructor(private readonly github: GithubCollector) {}

  /** Sliding window per client. Throws 429 rather than queueing. */
  assertQuota(ip: string): void {
    if (MAX_PER_WINDOW <= 0) return;
    const now = Date.now();
    const recent = (this.hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_PER_WINDOW) {
      throw new HttpException(
        'Preview limit reached. Create an account to keep scanning.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(ip, recent);
  }

  async scan(input: unknown, ip: string): Promise<PreviewResult> {
    const ref = parseRepoRef(input);
    if (!ref) {
      throw new BadRequestException(
        'Enter a public GitHub repository, for example "vercel/next.js".',
      );
    }

    const cached = this.cache.get(ref.full);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.result;

    // Quota is spent only on work we actually do, so a cached repeat is free.
    this.assertQuota(ip);

    // A synthetic connection with no token: the collector reads the public API
    // and skips SCA/SAST, which is exactly the depth a preview should have.
    const connection: ConnectionRecord = {
      id: 'preview',
      orgId: 'preview',
      projectId: 'preview',
      provider: 'github',
      status: 'active',
      metadata: { repos: [ref.full], selectedRepos: [ref.full] },
      createdAt: new Date().toISOString(),
    };

    let collected;
    try {
      collected = await this.github.collect(connection, {
        fetchImpl: fetch,
        // Unauthenticated GitHub allows 60 requests an hour for the whole
        // server, which one busy afternoon would exhaust for everybody. A
        // scopeless read-only token raises that to 5,000 without granting
        // access to anything private. Optional: without it the preview still
        // works, just against the shared anonymous budget.
        ...(PREVIEW_TOKEN ? { token: PREVIEW_TOKEN } : {}),
        // A preview maps the architecture and stops there — never run the
        // dependency or code analysis, whose results it would discard anyway.
        entitlements: { sca: false, codeAudit: false, secrets: false, iac: false, maxRepos: 1 },
      });
    } catch (err) {
      this.logger.warn(`Preview scan of ${ref.full} failed: ${(err as Error).message}`);
      throw new BadRequestException('Could not read that repository.');
    }

    const repos = collected.repos ?? [];
    if (repos.length === 0 || repos[0] === undefined) {
      throw new BadRequestException(
        'Could not read that repository. It must exist and be public.',
      );
    }

    const graph = buildSystemGraph({ repos });
    if (graph.nodes.length === 0) {
      throw new BadRequestException(
        'Nothing recognisable to map in that repository yet.',
      );
    }

    const result: PreviewResult = {
      repo: ref.full,
      graph: publicGraph(graph),
      posture: previewPosture(graph),
      detected: (repos[0].frameworks ?? []).slice(0, 8),
      scannedAt: new Date().toISOString(),
    };

    this.remember(ref.full, result);
    return result;
  }

  private remember(key: string, result: PreviewResult): void {
    if (this.cache.size >= CACHE_MAX) {
      // Cheap eviction: drop the oldest entry.
      const oldest = [...this.cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }
    this.cache.set(key, { at: Date.now(), result });
  }
}

/**
 * Rebuild the graph field by field.
 *
 * A tokenless scan should not produce findings or code detail in the first
 * place; constructing the response explicitly means a future change to the
 * collector cannot quietly start leaking them into an anonymous response.
 */
function publicGraph(graph: SystemGraph): SystemGraph {
  return {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      name: n.name,
      ...(n.provider ? { provider: n.provider } : {}),
      ...(n.region ? { region: n.region } : {}),
      ...(n.estimated ? { estimated: true } : {}),
    })),
    edges: graph.edges.map((e) => ({
      from: e.from,
      to: e.to,
      ...(e.criticality !== undefined ? { criticality: e.criticality } : {}),
    })),
  };
}

/**
 * The posture a preview is entitled to claim.
 *
 * Reliability, security and architecture are genuinely derivable from topology,
 * so they are scored for real. AI security and maintainability are not: a
 * tokenless scan never reads the source, so they come back unmeasured with a
 * note that says why. That split is honest and it is also the argument — two
 * fifths of the picture is missing until the repository is connected.
 *
 * Only scores, bands and counts cross the wire. No finding titles, no evidence.
 */
function previewPosture(graph: SystemGraph): RiskPosture {
  let findings: Finding[] = [];
  try {
    findings = [...reliabilityScore(graph).findings, ...securitySimulation(graph).findings];
  } catch {
    /* a partial graph simply yields a thinner posture */
  }

  const posture = riskPosture({ findings, graph, quality: null, analyzed: true });

  return {
    ...posture,
    dimensions: posture.dimensions.map((d) =>
      d.analyzed
        ? d
        : {
            ...d,
            // The engine's default note ("No AI components detected") would be a
            // claim we did not earn: we never read the code here, we only read
            // the dependency manifests.
            note: 'Needs your repository',
          },
    ),
  };
}

class PreviewScanDto {
  // The global ValidationPipe runs with `whitelist: true`, which strips any
  // property that carries no decorator — so this needs them even though
  // parseRepoRef does the real validation.
  @IsString()
  @MaxLength(200)
  repo!: string;
}

@Public()
@Controller('preview')
class PreviewController {
  constructor(private readonly preview: PreviewService) {}

  @Post('scan')
  async scan(@Body() dto: PreviewScanDto, @Req() req: Request) {
    const ip =
      (req.ip as string | undefined) ||
      (req.socket?.remoteAddress as string | undefined) ||
      'unknown';
    return this.preview.scan(dto?.repo, ip);
  }
}

@Module({
  imports: [ScannerModule],
  controllers: [PreviewController],
  providers: [PreviewService],
})
export class PreviewModule {}
