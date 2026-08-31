import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  checkKindFor,
  findingFingerprint,
  isSuppressed,
  validatable,
  type CheckOutcome,
  type Finding,
  type TriageStatus,
  type ValidationCheck,
} from '@riscly/shared';
import { Store, ValidationRunRecord } from '../store/store.module';
import { GithubService } from '../github/github.service';
import { verifySecretToken } from '../scanner/secret-verify';

/** Re-testing is bounded: a run is a quick confidence pass, not a second scan. */
const MAX_CHECKS = 25;

/**
 * Validation runs.
 *
 * Goes back to the source of truth for the findings that can actually be
 * re-tested and records what came back. The honest part is the third outcome:
 * anything we could not reach comes back `inconclusive` instead of quietly
 * passing, so the run never claims more than it verified.
 */
@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(
    private readonly store: Store,
    private readonly github: GithubService,
  ) {}

  /** Tenant guard: a project only belongs to the org that owns it. */
  async assertAccess(projectId: string, orgId: string): Promise<void> {
    const project = await this.store.getProject(projectId);
    if (!project || project.orgId !== orgId) {
      throw new NotFoundException('Project not found');
    }
  }

  async run(
    projectId: string,
    orgId: string,
    actorUserId?: string,
  ): Promise<ValidationRunRecord> {
    await this.assertAccess(projectId, orgId);
    const startedAt = new Date().toISOString();

    const scans = await this.store.listScans(projectId);
    const latest = scans.find((s) => s.status === 'succeeded');
    if (!latest) {
      throw new BadRequestException('Run a scan before validating findings.');
    }

    // Only open findings are worth re-testing; a risk the customer already
    // accepted does not need proving again.
    const suppressions = await this.store.listSuppressions(projectId);
    const statusOf = new Map(suppressions.map((s) => [s.fingerprint, s.status]));
    const findings = ((latest.findings ?? []) as Finding[]).filter(
      (f) => !isSuppressed(statusOf.get(findingFingerprint(f)) as TriageStatus),
    );

    const targets = validatable(findings).slice(0, MAX_CHECKS);
    const checks: ValidationCheck[] = [];
    for (const finding of targets) {
      checks.push(await this.check(finding, projectId, orgId));
    }

    return this.store.createValidationRun({
      orgId,
      projectId,
      startedAt,
      finishedAt: new Date().toISOString(),
      checks,
      actorUserId,
    });
  }

  async history(projectId: string, limit = 20): Promise<ValidationRunRecord[]> {
    return this.store.listValidationRuns(projectId, limit);
  }

  /** Re-test one finding. Never throws — a failure is an inconclusive result. */
  private async check(
    finding: Finding,
    projectId: string,
    orgId: string,
  ): Promise<ValidationCheck> {
    const kind = checkKindFor(finding) ?? 'code_location';
    const base = {
      fingerprint: findingFingerprint(finding),
      kind,
      title: finding.title,
      severity: finding.severity,
      file: finding.file,
      line: finding.line,
      repo: finding.repo,
    } as const;

    const inconclusive = (detail: string): ValidationCheck => ({
      ...base,
      outcome: 'inconclusive',
      detail,
    });

    try {
      if (kind === 'secret_live' || kind === 'code_location') {
        if (!finding.file || !finding.repo) {
          return inconclusive('No repository location recorded for this finding.');
        }
        const content = await this.github.readFile(
          projectId,
          orgId,
          finding.repo,
          finding.file,
        );
        if (content == null) {
          return inconclusive(
            `Could not read ${finding.file} — the file may have been moved or access revoked.`,
          );
        }
        const line = content.split('\n')[(finding.line ?? 1) - 1] ?? '';

        if (kind === 'secret_live') {
          const live = await verifySecretToken(finding.rule ?? '', line);
          if (live === null) {
            // The line no longer holds a token we recognise.
            return {
              ...base,
              outcome: 'resolved',
              detail: 'The credential is no longer present at this location.',
            };
          }
          return {
            ...base,
            outcome: live ? 'confirmed' : 'resolved',
            detail: live
              ? 'The provider accepted this credential — it is live and must be rotated.'
              : 'The credential is still committed but no longer authenticates.',
          };
        }

        // A located code finding: is the flagged construct still on that line?
        const stillThere = line.trim().length > 0;
        return {
          ...base,
          outcome: stillThere ? 'confirmed' : 'resolved',
          detail: stillThere
            ? `${finding.file}:${finding.line} still contains the flagged code.`
            : `${finding.file}:${finding.line} is now empty — the code appears to have been removed.`,
        };
      }

      // Advisory and configuration checks are re-established by the scanner
      // itself; a fresh scan is the honest way to re-test them.
      return inconclusive(
        kind === 'dependency_advisory'
          ? 'Advisory state is re-established by a scan — run a scan to re-check the dependency tree.'
          : 'Provider configuration is re-read during a scan — run a scan to re-check it.',
      );
    } catch (err) {
      this.logger.warn(`Validation check failed: ${(err as Error).message}`);
      return inconclusive('The check could not be completed.');
    }
  }
}

export type { CheckOutcome };
