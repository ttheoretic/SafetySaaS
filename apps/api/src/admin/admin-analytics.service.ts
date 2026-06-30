import { Injectable, Logger } from '@nestjs/common';

/** Canonical product events (must mirror apps/web/lib/analytics.ts). */
const FUNNEL_STEPS = [
  'landing_viewed',
  'pricing_viewed',
  'sign_up',
  'github_connected',
  'architecture_generated',
  'subscription_created',
];

export interface AdminAnalytics {
  connected: boolean;
  dau: number | null;
  wau: number | null;
  mau: number | null;
  avgSessionSec: number | null;
  bounceRatePct: number | null;
  returningPct: number | null;
  dauSeries: { date: string; value: number }[];
  topPages: { label: string; value: number }[];
  topFeatures: { label: string; value: number }[];
  funnel: { step: string; users: number }[];
}

/**
 * Pulls product analytics from PostHog's Query API (HogQL) so DAU/WAU/MAU,
 * top pages/features, funnel, bounce and session duration render directly in
 * the admin console — no need to open PostHog. Optional: without
 * POSTHOG_API_KEY + POSTHOG_PROJECT_ID it reports connected:false. Every query
 * is isolated, so one failing metric never breaks the others.
 */
@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);
  private readonly apiKey = process.env.POSTHOG_API_KEY;
  private readonly projectId = process.env.POSTHOG_PROJECT_ID;
  // Query API host (app host, not the ingestion host): eu.posthog.com / us.posthog.com.
  private readonly host = (process.env.POSTHOG_API_HOST ?? 'https://eu.posthog.com').replace(/\/$/, '');

  get enabled(): boolean {
    return Boolean(this.apiKey && this.projectId);
  }

  /** Run one HogQL query; returns rows ([][]) or null on any failure. */
  private async hogql(query: string): Promise<unknown[][] | null> {
    if (!this.enabled) return null;
    try {
      const res = await fetch(`${this.host}/api/projects/${this.projectId}/query/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
      });
      if (!res.ok) throw new Error(`PostHog query ${res.status}`);
      const body = (await res.json()) as { results?: unknown[][] };
      return body.results ?? [];
    } catch (err) {
      this.logger.warn(`HogQL failed: ${(err as Error).message}`);
      return null;
    }
  }

  private async scalar(query: string): Promise<number | null> {
    const rows = await this.hogql(query);
    const v = rows?.[0]?.[0];
    return typeof v === 'number' ? v : v != null ? Number(v) || 0 : null;
  }

  async analytics(): Promise<AdminAnalytics> {
    if (!this.enabled) {
      return {
        connected: false, dau: null, wau: null, mau: null, avgSessionSec: null,
        bounceRatePct: null, returningPct: null, dauSeries: [], topPages: [], topFeatures: [], funnel: [],
      };
    }

    const activeUsers = (days: number) =>
      this.scalar(`SELECT count(DISTINCT person_id) FROM events WHERE timestamp > now() - INTERVAL ${days} DAY`);

    const dauSeriesQ = this.hogql(
      `SELECT toStartOfDay(timestamp) AS d, count(DISTINCT person_id) AS c
       FROM events WHERE timestamp > now() - INTERVAL 30 DAY GROUP BY d ORDER BY d`,
    );
    const topPagesQ = this.hogql(
      `SELECT properties.$pathname AS p, count() AS c
       FROM events WHERE event = '$pageview' AND timestamp > now() - INTERVAL 30 DAY
       GROUP BY p ORDER BY c DESC LIMIT 10`,
    );
    const topFeaturesQ = this.hogql(
      `SELECT event, count() AS c
       FROM events WHERE timestamp > now() - INTERVAL 30 DAY AND event NOT LIKE '$%'
       GROUP BY event ORDER BY c DESC LIMIT 15`,
    );
    const funnelQ = this.hogql(
      `SELECT event, count(DISTINCT person_id) AS c
       FROM events WHERE event IN (${FUNNEL_STEPS.map((s) => `'${s}'`).join(',')})
       AND timestamp > now() - INTERVAL 30 DAY GROUP BY event`,
    );
    // Best-effort session metrics (the sessions table syntax can vary by version).
    const sessionQ = this.hogql(
      `SELECT round(avg(sessions.$session_duration)) AS dur,
              round(100 * countIf(sessions.$pageview_count <= 1) / count()) AS bounce
       FROM sessions WHERE sessions.$start_timestamp > now() - INTERVAL 30 DAY`,
    );
    const returningQ = this.scalar(
      `SELECT count(DISTINCT person_id) FROM events
       WHERE timestamp > now() - INTERVAL 7 DAY
       AND person_id IN (SELECT DISTINCT person_id FROM events
         WHERE timestamp > now() - INTERVAL 14 DAY AND timestamp <= now() - INTERVAL 7 DAY)`,
    );

    const [dau, wau, mau, dauRows, pageRows, featRows, funnelRows, sessionRows, returning, priorWau] =
      await Promise.all([
        activeUsers(1), activeUsers(7), activeUsers(30),
        dauSeriesQ, topPagesQ, topFeaturesQ, funnelQ, sessionQ, returningQ,
        this.scalar(
          `SELECT count(DISTINCT person_id) FROM events
           WHERE timestamp > now() - INTERVAL 14 DAY AND timestamp <= now() - INTERVAL 7 DAY`,
        ),
      ]);

    const funnelMap = new Map<string, number>(
      (funnelRows ?? []).map((r) => [String(r[0]), Number(r[1]) || 0]),
    );

    return {
      connected: true,
      dau, wau, mau,
      avgSessionSec: sessionRows?.[0]?.[0] != null ? Number(sessionRows[0][0]) || 0 : null,
      bounceRatePct: sessionRows?.[0]?.[1] != null ? Number(sessionRows[0][1]) || 0 : null,
      returningPct:
        returning != null && priorWau && priorWau > 0 ? Math.round((returning / priorWau) * 100) : null,
      dauSeries: (dauRows ?? []).map((r) => ({ date: String(r[0]).slice(0, 10), value: Number(r[1]) || 0 })),
      topPages: (pageRows ?? []).map((r) => ({ label: String(r[0] ?? '/'), value: Number(r[1]) || 0 })),
      topFeatures: (featRows ?? []).map((r) => ({ label: String(r[0]), value: Number(r[1]) || 0 })),
      funnel: FUNNEL_STEPS.map((step) => ({ step, users: funnelMap.get(step) ?? 0 })),
    };
  }
}
