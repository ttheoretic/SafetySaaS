import { Injectable } from '@nestjs/common';
import { PLAN_LIMITS, PLAN_ORDER, type Plan } from '@riscly/shared';
import {
  Store,
  type OrganizationRecord,
  type ScanRecord,
  type ConnectionRecord,
} from '../store/store.module';

const CLOUD_PROVIDERS = new Set(['aws', 'azure', 'gcp', 'vercel', 'railway', 'render', 'supabase', 'neon']);
const PAYING_STATUSES = new Set(['active', 'past_due', 'trialing']);

/** Monthly price for a plan (0 for custom/enterprise without a set price). */
function monthlyPrice(plan: Plan): number {
  return PLAN_LIMITS[plan].priceEur ?? 0;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** A zero-filled daily series for the last `days` days, applying `add` per row. */
function dailySeries<T>(
  rows: T[],
  getIso: (r: T) => string,
  days: number,
  add: (acc: number, r: T) => number = (acc) => acc + 1,
): { date: string; value: number }[] {
  const buckets = new Map<string, number>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const k = dayKey(getIso(r));
    if (buckets.has(k)) buckets.set(k, add(buckets.get(k)!, r));
  }
  return [...buckets.entries()].map(([date, value]) => ({ date, value }));
}

@Injectable()
export class AdminService {
  constructor(private readonly store: Store) {}

  /** The latest succeeded scan per project, used for posture averages. */
  private latestScoredByProject(scans: ScanRecord[]): Map<string, ScanRecord> {
    const byProject = new Map<string, ScanRecord>();
    for (const s of scans) {
      if (s.status !== 'succeeded') continue;
      const cur = byProject.get(s.projectId);
      if (!cur || s.createdAt > cur.createdAt) byProject.set(s.projectId, s);
    }
    return byProject;
  }

  private githubAccounts(conns: ConnectionRecord[]): number {
    const ids = new Set<string>();
    for (const c of conns) {
      if (c.provider !== 'github') continue;
      const repos = Array.isArray(c.metadata?.repos) ? (c.metadata.repos as string[]) : [];
      const owner = repos[0]?.split('/')[0];
      ids.add(owner ?? c.id);
    }
    return ids.size;
  }

  async overview() {
    const [orgs, subs, projects, scans, conns, users] = await Promise.all([
      this.store.listOrganizations(),
      this.store.listAllSubscriptions(),
      this.store.listAllProjects(),
      this.store.listAllScans(),
      this.store.listAllConnections(),
      this.store.listAllUsers(),
    ]);

    const subByOrg = new Map(subs.map((s) => [s.orgId, s]));
    const paying = orgs.filter((o) => PAYING_STATUSES.has(subByOrg.get(o.id)?.status ?? 'none'));
    const trialing = subs.filter((s) => s.status === 'trialing').length;

    const mrr = paying.reduce((sum, o) => sum + monthlyPrice(subByOrg.get(o.id)?.plan ?? o.plan), 0);

    const latest = this.latestScoredByProject(scans);
    const scores = [...latest.values()].map((s) => s.reliabilityScore ?? 0).filter((n) => n > 0);
    const avgReliability = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // Revenue at risk: per project businessContext.monthlyRevenue weighted by its
    // risk (100 - reliability). Real where customers entered business context.
    let revAtRisk = 0;
    let revAtRiskN = 0;
    for (const p of projects) {
      const mr = Number((p.businessContext as { monthlyRevenue?: number })?.monthlyRevenue ?? 0);
      if (!mr) continue;
      const rel = latest.get(p.id)?.reliabilityScore ?? 100;
      revAtRisk += mr * ((100 - rel) / 100);
      revAtRiskN++;
    }

    const activeWorkspaces = new Set(
      scans.filter((s) => s.status === 'succeeded').map((s) => s.orgId),
    ).size;

    const planDist = PLAN_ORDER.map((plan) => ({
      plan,
      count: orgs.filter((o) => (subByOrg.get(o.id)?.plan ?? o.plan) === plan).length,
    }));

    return {
      kpis: {
        mrr: Math.round(mrr),
        arr: Math.round(mrr * 12),
        activeCustomers: paying.length,
        trialUsers: trialing,
        activeWorkspaces,
        totalGithubAccounts: this.githubAccounts(conns),
        connectedCloudProviders: conns.filter((c) => CLOUD_PROVIDERS.has(c.provider)).length,
        avgReliabilityScore: avgReliability,
        avgRisksPerWorkspace: latest.size
          ? Math.round(
              ([...latest.values()].reduce((a, s) => a + ((s.findings as unknown[])?.length ?? 0), 0) /
                latest.size) * 10,
            ) / 10
          : 0,
        avgRevenueAtRisk: revAtRiskN ? Math.round(revAtRisk / revAtRiskN) : 0,
        totalCustomers: orgs.length,
        totalUsers: users.length,
      },
      charts: {
        signups: dailySeries(users, (u) => u.createdAt, 30),
        scans: dailySeries(scans, (s) => s.createdAt, 30),
        newWorkspaces: dailySeries(orgs, (o) => o.createdAt, 30),
        planDistribution: planDist,
      },
    };
  }

  /** Recent cross-tenant activity for the overview feed. */
  async activity(limit = 25) {
    const [orgs, subs, conns, scans] = await Promise.all([
      this.store.listOrganizations(),
      this.store.listAllSubscriptions(),
      this.store.listAllConnections(),
      this.store.listAllScans(),
    ]);
    const orgName = new Map(orgs.map((o) => [o.id, o.name]));
    type Item = { type: string; label: string; workspace?: string; at: string };
    const items: Item[] = [];
    for (const o of orgs) items.push({ type: 'workspace', label: 'New workspace', workspace: o.name, at: o.createdAt });
    for (const s of subs.filter((x) => PAYING_STATUSES.has(x.status)))
      items.push({ type: 'subscription', label: `Subscription · ${s.plan}`, workspace: orgName.get(s.orgId), at: s.currentPeriodEnd ?? new Date().toISOString() });
    for (const c of conns.filter((x) => x.provider === 'github'))
      items.push({ type: 'github', label: 'GitHub connected', workspace: orgName.get(c.orgId), at: c.createdAt });
    for (const s of scans.filter((x) => x.status === 'succeeded'))
      items.push({ type: 'scan', label: 'Architecture generated', workspace: orgName.get(s.orgId), at: s.finishedAt ?? s.createdAt });

    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  }

  async customers() {
    const [orgs, subs, projects, scans, conns] = await Promise.all([
      this.store.listOrganizations(),
      this.store.listAllSubscriptions(),
      this.store.listAllProjects(),
      this.store.listAllScans(),
      this.store.listAllConnections(),
    ]);
    const subByOrg = new Map(subs.map((s) => [s.orgId, s]));
    const projByOrg = new Map<string, number>();
    for (const p of projects) projByOrg.set(p.orgId, (projByOrg.get(p.orgId) ?? 0) + 1);
    const latest = this.latestScoredByProject(scans);
    const scoreByOrg = new Map<string, number[]>();
    for (const s of latest.values()) {
      const arr = scoreByOrg.get(s.orgId) ?? [];
      arr.push(s.reliabilityScore ?? 0);
      scoreByOrg.set(s.orgId, arr);
    }
    const lastActivityByOrg = new Map<string, string>();
    for (const s of scans) {
      const cur = lastActivityByOrg.get(s.orgId);
      if (!cur || s.createdAt > cur) lastActivityByOrg.set(s.orgId, s.createdAt);
    }

    const ownerByOrg = new Map<string, string>();
    await Promise.all(
      orgs.map(async (o) => {
        const members = await this.store.listMembershipsForOrg(o.id);
        const owner = members.find((m) => m.role === 'owner') ?? members[0];
        if (owner) {
          const u = await this.store.getUser(owner.userId);
          ownerByOrg.set(o.id, u?.email ?? owner.userId);
        }
        projByOrg.set(o.id, projByOrg.get(o.id) ?? 0);
      }),
    );
    const memberCounts = new Map<string, number>();
    await Promise.all(
      orgs.map(async (o) => memberCounts.set(o.id, (await this.store.listMembershipsForOrg(o.id)).length)),
    );

    return orgs
      .map((o) => {
        const sub = subByOrg.get(o.id);
        const scoreArr = scoreByOrg.get(o.id) ?? [];
        const avgScore = scoreArr.length ? Math.round(scoreArr.reduce((a, b) => a + b, 0) / scoreArr.length) : null;
        return {
          orgId: o.id,
          company: o.name,
          workspace: o.slug,
          plan: sub?.plan ?? o.plan,
          owner: ownerByOrg.get(o.id) ?? '—',
          users: memberCounts.get(o.id) ?? 1,
          projects: projByOrg.get(o.id) ?? 0,
          joined: o.createdAt,
          lastActive: lastActivityByOrg.get(o.id) ?? null,
          riskScore: avgScore,
          status: sub?.status ?? 'free',
          githubConnected: conns.some((c) => c.orgId === o.id && c.provider === 'github'),
        };
      })
      .sort((a, b) => b.joined.localeCompare(a.joined));
  }

  async customer(orgId: string) {
    const org = await this.store.getOrganization(orgId);
    if (!org) return null;
    const [sub, projects, members, audit] = await Promise.all([
      this.store.getSubscription(orgId),
      this.store.listProjects(orgId),
      this.store.listMembershipsForOrg(orgId),
      this.store.listAuditLogs(orgId),
    ]);
    const projectDetails = await Promise.all(
      projects.map(async (p) => {
        const [conns, scans, scenarios] = await Promise.all([
          this.store.listConnections(p.id),
          this.store.listScans(p.id),
          this.store.listScenarios(p.id),
        ]);
        const lastScan = scans[0];
        return {
          id: p.id,
          name: p.name,
          integrations: conns.map((c) => ({ provider: c.provider, status: c.status, createdAt: c.createdAt })),
          scans: scans.slice(0, 5).map((s) => ({ id: s.id, status: s.status, score: s.reliabilityScore, createdAt: s.createdAt })),
          scenarios: scenarios.slice(0, 5).map((sc) => ({ id: sc.id, name: sc.name, createdAt: sc.createdAt })),
          reliabilityScore: lastScan?.reliabilityScore ?? null,
          businessContext: p.businessContext ?? null,
        };
      }),
    );
    const owners = await Promise.all(
      members.map(async (m) => {
        const u = await this.store.getUser(m.userId);
        return { userId: m.userId, email: u?.email, name: u?.name, role: m.role, lastSeenAt: u?.lastSeenAt };
      }),
    );
    const aiUsage = (await this.store.listAiUsageSince(new Date(Date.now() - 30 * 86400_000).toISOString()))
      .filter((u) => u.orgId === orgId);
    const aiTotals = aiUsage.reduce(
      (acc, u) => {
        acc.requests++;
        acc.tokens += u.promptTokens + u.completionTokens;
        acc.cost += u.costUsd;
        return acc;
      },
      { requests: 0, tokens: 0, cost: 0 },
    );

    return {
      org: { id: org.id, name: org.name, slug: org.slug, plan: org.plan, createdAt: org.createdAt },
      subscription: sub ?? null,
      members: owners,
      projects: projectDetails,
      aiUsage: { ...aiTotals, cost: Math.round(aiTotals.cost * 100) / 100 },
      recentActivity: audit.slice(0, 20),
    };
  }

  // --- Billing ---------------------------------------------------------------
  async billing() {
    const [orgs, subs] = await Promise.all([
      this.store.listOrganizations(),
      this.store.listAllSubscriptions(),
    ]);
    const orgById = new Map(orgs.map((o) => [o.id, o]));
    const paying = subs.filter((s) => PAYING_STATUSES.has(s.status));
    const mrr = paying.reduce((sum, s) => sum + monthlyPrice(s.plan), 0);
    const rows = subs.map((s) => {
      const org = orgById.get(s.orgId);
      const joined = org?.createdAt ?? new Date().toISOString();
      const months = Math.max(1, Math.round((Date.now() - new Date(joined).getTime()) / (30 * 86400_000)));
      return {
        orgId: s.orgId,
        customer: org?.name ?? s.orgId,
        plan: s.plan,
        status: s.status,
        renewalDate: s.currentPeriodEnd ?? null,
        mrr: monthlyPrice(s.plan),
        ltv: monthlyPrice(s.plan) * months,
        stripeCustomerId: s.stripeCustomerId ?? null,
      };
    });
    return {
      summary: {
        mrr: Math.round(mrr),
        arr: Math.round(mrr * 12),
        activeSubscriptions: paying.length,
        trials: subs.filter((s) => s.status === 'trialing').length,
        pastDue: subs.filter((s) => s.status === 'past_due').length,
        canceled: subs.filter((s) => s.status === 'canceled').length,
        newThisMonth: orgs.filter((o) => Date.now() - new Date(o.createdAt).getTime() < 30 * 86400_000).length,
      },
      customers: rows.sort((a, b) => b.mrr - a.mrr),
    };
  }

  // --- AI usage --------------------------------------------------------------
  async aiUsage() {
    const sinceIso = new Date(Date.now() - 30 * 86400_000).toISOString();
    const [usage, orgs] = await Promise.all([
      this.store.listAiUsageSince(sinceIso),
      this.store.listOrganizations(),
    ]);
    const orgName = new Map(orgs.map((o) => [o.id, o.name]));
    const totals = usage.reduce(
      (acc, u) => {
        acc.requests++;
        acc.inputTokens += u.promptTokens;
        acc.outputTokens += u.completionTokens;
        acc.cost += u.costUsd;
        return acc;
      },
      { requests: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
    );
    const byModel = new Map<string, { requests: number; cost: number }>();
    for (const u of usage) {
      const m = byModel.get(u.model) ?? { requests: 0, cost: 0 };
      m.requests++;
      m.cost += u.costUsd;
      byModel.set(u.model, m);
    }
    const byOrg = new Map<string, { requests: number; tokens: number; cost: number; model: string; last: string }>();
    for (const u of usage) {
      const o = byOrg.get(u.orgId) ?? { requests: 0, tokens: 0, cost: 0, model: u.model, last: u.createdAt };
      o.requests++;
      o.tokens += u.promptTokens + u.completionTokens;
      o.cost += u.costUsd;
      if (u.createdAt > o.last) o.last = u.createdAt;
      byOrg.set(u.orgId, o);
    }
    const activeUsers = new Set(usage.map((u) => u.userId ?? u.orgId)).size || 1;
    return {
      cards: {
        totalRequests: totals.requests,
        totalTokens: totals.inputTokens + totals.outputTokens,
        inputTokens: totals.inputTokens,
        outputTokens: totals.outputTokens,
        monthlyCost: Math.round(totals.cost * 100) / 100,
        avgCostPerUser: Math.round((totals.cost / activeUsers) * 100) / 100,
      },
      charts: {
        dailyCost: dailySeries(usage, (u) => u.createdAt, 30, (acc, u) => acc + u.costUsd),
        byModel: [...byModel.entries()].map(([model, v]) => ({ model, ...v, cost: Math.round(v.cost * 100) / 100 })),
      },
      customers: [...byOrg.entries()]
        .map(([orgId, v]) => ({ orgId, company: orgName.get(orgId) ?? orgId, ...v, cost: Math.round(v.cost * 100) / 100 }))
        .sort((a, b) => b.cost - a.cost),
    };
  }

  // --- Feedback --------------------------------------------------------------
  async feedback() {
    const [items, orgs] = await Promise.all([this.store.listFeedback(), this.store.listOrganizations()]);
    const orgName = new Map(orgs.map((o) => [o.id, o.name]));
    return items.map((f) => ({ ...f, workspace: f.orgId ? orgName.get(f.orgId) ?? f.orgId : null }));
  }

  async updateFeedback(id: string, patch: Record<string, unknown>) {
    return this.store.updateFeedback(id, patch);
  }

  // --- Infrastructure --------------------------------------------------------
  async infra() {
    const t0 = Date.now();
    const dbOk = await this.store.ping().catch(() => false);
    const dbLatency = Date.now() - t0;
    const has = (k: string) => Boolean(process.env[k]);
    const service = (name: string, ok: boolean, latency?: number, note?: string | null) => ({
      name,
      status: ok ? 'operational' : 'unconfigured',
      latencyMs: latency ?? null,
      note: note ?? null,
    });
    return {
      services: [
        service('Backend API', true, dbLatency),
        service('Database (Postgres)', dbOk, dbLatency, has('DATABASE_URL') ? null : 'In-memory store (no DATABASE_URL)'),
        service('Redis / Queue', has('REDIS_URL'), undefined, has('REDIS_URL') ? null : 'Inline queue (no REDIS_URL)'),
        service('Worker', has('REDIS_URL')),
        service('Storage', has('STORAGE_BUCKET') || has('SUPABASE_URL')),
        service('GitHub API', true),
        service('Anthropic API', has('ANTHROPIC_API_KEY')),
        service('Stripe API', has('STRIPE_SECRET_KEY')),
        service('Email (Resend)', has('RESEND_API_KEY')),
      ],
      env: {
        nodeVersion: process.version,
        uptimeSec: Math.round(process.uptime()),
        memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    };
  }

  // --- Settings --------------------------------------------------------------
  private readonly SETTING_KEYS = ['feature_flags', 'maintenance', 'announcement'];
  async settings() {
    const rows = await this.store.listSettings();
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    return {
      featureFlags: byKey.get('feature_flags') ?? {},
      maintenance: byKey.get('maintenance') ?? { enabled: false, message: '' },
      announcement: byKey.get('announcement') ?? { enabled: false, message: '' },
      system: {
        version: process.env.APP_VERSION ?? 'dev',
        commit: process.env.GIT_SHA ?? null,
        node: process.version,
      },
      integrations: {
        stripe: Boolean(process.env.STRIPE_SECRET_KEY),
        anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
        resend: Boolean(process.env.RESEND_API_KEY),
        redis: Boolean(process.env.REDIS_URL),
        posthog: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
        sentry: Boolean(process.env.SENTRY_DSN),
      },
    };
  }

  async updateSetting(key: string, value: Record<string, unknown>) {
    if (!this.SETTING_KEYS.includes(key)) throw new Error(`Unknown setting: ${key}`);
    return this.store.setSetting(key, value);
  }

  // --- Admin actions ---------------------------------------------------------
  async logAction(actorUserId: string, action: string, target?: { type?: string; id?: string }, metadata: Record<string, unknown> = {}) {
    return this.store.addAdminLog({ actorUserId, action, targetType: target?.type, targetId: target?.id, metadata });
  }

  /** Suspend a workspace by canceling its subscription (revokes app access). */
  async suspendWorkspace(orgId: string) {
    const sub = await this.store.getSubscription(orgId);
    return this.store.upsertSubscription({
      orgId,
      plan: sub?.plan ?? 'starter',
      status: 'canceled',
      stripeCustomerId: sub?.stripeCustomerId,
      stripeSubscriptionId: sub?.stripeSubscriptionId,
      currentPeriodEnd: sub?.currentPeriodEnd,
    });
  }

  async reactivateWorkspace(orgId: string) {
    const sub = await this.store.getSubscription(orgId);
    return this.store.upsertSubscription({
      orgId,
      plan: sub?.plan ?? 'starter',
      status: 'active',
      stripeCustomerId: sub?.stripeCustomerId,
      stripeSubscriptionId: sub?.stripeSubscriptionId,
      currentPeriodEnd: sub?.currentPeriodEnd,
    });
  }

  async resetSubscription(orgId: string) {
    return this.store.upsertSubscription({ orgId, plan: 'starter', status: 'none' });
  }

  /** The admin-console audit trail, with the acting admin resolved. */
  async logs() {
    const rows = await this.store.listAdminLogs();
    const actorIds = [...new Set(rows.map((r) => r.actorUserId))];
    const actors = new Map<string, { email?: string; name?: string }>();
    await Promise.all(
      actorIds.map(async (id) => {
        const u = await this.store.getUser(id);
        if (u) actors.set(id, { email: u.email, name: u.name });
      }),
    );
    return rows.map((r) => ({ ...r, actor: actors.get(r.actorUserId) ?? null }));
  }
}
