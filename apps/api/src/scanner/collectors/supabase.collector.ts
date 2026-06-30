import { Injectable, Logger } from '@nestjs/common';
import type { ScanCollection, DatabaseSignals, Finding } from '@riscly/shared';
import type { ConnectionRecord } from '../../store/store.module';
import {
  ProviderCollector,
  CollectorContext,
  resilientFetch,
  mapWithConcurrency,
} from './collector';

interface SupabaseProject {
  id: string;
  name: string;
  region?: string;
}

/** GoTrue (Supabase Auth) settings — a public, read-only config endpoint. */
interface GoTrueSettings {
  disable_signup?: boolean;
  mailer_autoconfirm?: boolean;
  external?: Record<string, boolean>;
}

const RLS_PROBE_LIMIT = 12;

/**
 * Supabase collector. Two modes, both read-only:
 *
 *  1. Topology — with a management PAT, list projects from the Management API.
 *  2. Verified posture — with a project URL (metadata.url) it reads the real,
 *     auditable config: GoTrue auth settings (open sign-up, email auto-confirm)
 *     and, when an anon key is provided, probes a sample of REST-exposed tables
 *     for anonymous readability (RLS disabled / permissive). Every finding is a
 *     fact read from the live project, not an inference.
 */
@Injectable()
export class SupabaseCollector implements ProviderCollector {
  readonly provider = 'supabase';
  private readonly logger = new Logger(SupabaseCollector.name);

  async collect(
    connection: ConnectionRecord,
    ctx: CollectorContext,
  ): Promise<Partial<ScanCollection>> {
    const meta = connection.metadata ?? {};
    const url = typeof meta.url === 'string' ? meta.url.replace(/\/$/, '') : undefined;
    const anonKey = typeof meta.anonKey === 'string' ? meta.anonKey : undefined;

    const fallback: DatabaseSignals = {
      provider: 'supabase',
      name: (meta.name as string) ?? hostName(url) ?? 'Supabase',
      region: meta.region as string | undefined,
      hasBackup: (meta.hasBackup as boolean | undefined) ?? true,
      redundant: meta.redundant as boolean | undefined,
    };

    const findings: Finding[] = [];
    let databases: DatabaseSignals[] = [fallback];

    // Mode 1: management PAT → list projects (topology).
    if (ctx.token && !url) {
      databases = await this.listProjects(ctx, fallback);
    }

    // Mode 2: project URL → verified security posture.
    if (url) {
      const apiKey = ctx.token ?? anonKey;
      findings.push(...(await this.auditAuth(url, apiKey, ctx)));
      if (anonKey) {
        findings.push(...(await this.probeRls(url, anonKey, ctx)));
      }
    }

    return { databases, ...(findings.length ? { findings } : {}) };
  }

  private async listProjects(
    ctx: CollectorContext,
    fallback: DatabaseSignals,
  ): Promise<DatabaseSignals[]> {
    try {
      const res = await resilientFetch(ctx.fetchImpl, 'https://api.supabase.com/v1/projects', {
        headers: { Authorization: `Bearer ${ctx.token}`, accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Supabase API ${res.status}`);
      const all = ((await res.json()) as SupabaseProject[]) ?? [];
      // A management PAT lists EVERY project in the account. When we know which
      // repos this Riscly project covers, keep only the Supabase project(s)
      // whose name matches a connected repo, so unrelated projects don't show up
      // as stray database nodes. No match (or no hints) → keep all.
      const hints = (ctx.repoHints ?? []).map((h) => h.split('/').pop() ?? h).map(slug);
      const matched = hints.length ? all.filter((p) => hints.includes(slug(p.name))) : [];
      const projects = (matched.length ? matched : all).slice(0, 25);
      const dbs: DatabaseSignals[] = projects.map((p) => ({
        provider: 'supabase',
        name: p.name,
        region: p.region,
        hasBackup: true,
      }));
      return dbs.length ? dbs : [fallback];
    } catch (err) {
      this.logger.warn(`Supabase project listing failed: ${(err as Error).message}`);
      return [fallback];
    }
  }

  /** Read GoTrue auth settings and flag insecure defaults. */
  private async auditAuth(
    url: string,
    apiKey: string | undefined,
    ctx: CollectorContext,
  ): Promise<Finding[]> {
    if (!apiKey) return [];
    try {
      const res = await resilientFetch(ctx.fetchImpl, `${url}/auth/v1/settings`, {
        headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return [];
      const s = (await res.json()) as GoTrueSettings;
      const out: Finding[] = [];
      if (s.disable_signup === false) {
        out.push({
          category: 'security',
          severity: 'medium',
          title: 'Supabase: open user sign-up is enabled',
          description:
            'Anyone can create an account (disable_signup=false). If self-service sign-up is not intended, disable it or gate it behind an allowlist/invite flow.',
          weight: 8,
        });
      }
      if (s.mailer_autoconfirm === true) {
        out.push({
          category: 'security',
          severity: 'high',
          title: 'Supabase: email auto-confirm is enabled',
          description:
            'mailer_autoconfirm=true means email addresses are never verified, enabling account spoofing and spam sign-ups. Require email confirmation.',
          weight: 14,
        });
      }
      return out;
    } catch (err) {
      this.logger.warn(`Supabase auth audit failed: ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * Probe REST-exposed tables for anonymous readability. A table that returns
   * 2xx to an anon SELECT has RLS disabled or a permissive policy — a verified
   * data-exposure finding.
   */
  private async probeRls(
    url: string,
    anonKey: string,
    ctx: CollectorContext,
  ): Promise<Finding[]> {
    try {
      const specRes = await resilientFetch(ctx.fetchImpl, `${url}/rest/v1/`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      });
      if (!specRes.ok) return [];
      const spec = (await specRes.json()) as { definitions?: Record<string, unknown>; paths?: Record<string, unknown> };
      const tables = Object.keys(spec.definitions ?? {}).filter((t) => t && t !== 'rpc');
      const sample = tables.slice(0, RLS_PROBE_LIMIT);

      const exposed = await mapWithConcurrency(sample, 4, async (table) => {
        try {
          const r = await resilientFetch(
            ctx.fetchImpl,
            `${url}/rest/v1/${encodeURIComponent(table)}?select=*&limit=1`,
            { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
          );
          return r.ok ? table : null; // 2xx → anon can read it
        } catch {
          return null;
        }
      });

      const open = exposed.filter((t): t is string => Boolean(t));
      return open.slice(0, 8).map((table) => ({
        category: 'security',
        severity: 'high',
        title: `Supabase: table "${table}" is readable by anonymous users`,
        description:
          `The REST endpoint for "${table}" returned data to the anon role, so Row Level Security is disabled or permissive. Enable RLS and add policies restricting access to authorized rows.`,
        weight: 14,
      }));
    } catch (err) {
      this.logger.warn(`Supabase RLS probe failed: ${(err as Error).message}`);
      return [];
    }
  }
}

function hostName(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.split('.')[0];
  } catch {
    return undefined;
  }
}

/** Normalize a name for loose matching (lowercase, strip non-alphanumerics). */
function slug(s: string): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
