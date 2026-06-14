/**
 * Provider adapters (pure transforms).
 *
 * Each function takes one provider's normalized signals and returns a
 * GraphFragment. No I/O — the I/O lives in the API collectors.
 */

import { SystemNode, SystemEdge, NodeKind } from '../model';
import { GraphFragment } from './fragment';
import {
  RepoSignals,
  CloudSignals,
  DatabaseSignals,
  BillingSignals,
  SERVICE_HINTS,
} from './signals';

/** Default criticality of an API→backing-service dependency, by node kind. */
const EDGE_CRITICALITY: Partial<Record<NodeKind, number>> = {
  database: 1,
  cache: 0.6,
  queue: 0.7,
  external_api: 0.6,
  storage: 0.7,
  cdn: 0.9,
};

const FRONTEND_FRAMEWORKS = ['nextjs', 'next', 'react', 'vue', 'nuxt', 'svelte', 'angular'];
const API_FRAMEWORKS = ['nestjs', 'nest', 'express', 'fastify', 'koa', 'hapi', 'django', 'flask', 'rails'];

/**
 * Build a fragment from one repository: a frontend and/or api node plus the
 * backing services inferred from its dependencies and env vars.
 */
export function repoFragment(repo: RepoSignals): GraphFragment {
  const nodes: SystemNode[] = [];
  const edges: SystemEdge[] = [];
  const frameworks = (repo.frameworks ?? []).map((f) => f.toLowerCase());
  const safeName = repo.repo.split('/').pop() ?? repo.repo;

  const hasFrontend = frameworks.some((f) => FRONTEND_FRAMEWORKS.includes(f));
  const hasApi = frameworks.some((f) => API_FRAMEWORKS.includes(f));

  let frontendId: string | undefined;
  let apiId: string | undefined;

  if (hasFrontend) {
    frontendId = `${safeName}-frontend`;
    nodes.push({
      id: frontendId,
      kind: 'frontend',
      name: `${safeName} Frontend`,
      provider: repo.hostProvider,
      // Edge/CDN hosting (Vercel/Cloudflare) is typically redundant.
      redundant: repo.hostProvider === 'vercel' || undefined,
    });
  }

  if (hasApi || !hasFrontend) {
    apiId = `${safeName}-api`;
    nodes.push({
      id: apiId,
      kind: 'api',
      name: `${safeName} API`,
      provider: repo.hostProvider,
      hasRateLimit: detectRateLimit(repo),
      hasAuth: detectAuth(repo),
      redundant: repo.hasKubernetes ? true : undefined,
    });
  }

  if (frontendId && apiId) {
    edges.push({ from: frontendId, to: apiId, criticality: 1 });
  }

  // Backing services from dependency + env-var hints.
  const tokens = [
    ...repo.dependencies.map((d) => d.toLowerCase()),
    ...(repo.envVars ?? []).map((e) => e.toLowerCase()),
  ];
  const sourceId = apiId ?? frontendId;
  const seen = new Set<string>();
  for (const hint of SERVICE_HINTS) {
    if (!tokens.some((t) => hint.match.test(t))) continue;
    if (seen.has(hint.id)) continue;
    seen.add(hint.id);
    nodes.push({
      id: hint.id,
      kind: hint.kind,
      name: hint.name,
      provider: hint.provider,
      ...hint.defaults,
    });
    if (sourceId) {
      edges.push({
        from: sourceId,
        to: hint.id,
        criticality: EDGE_CRITICALITY[hint.kind] ?? 0.6,
      });
    }
  }

  return { nodes, edges };
}

export function cloudFragment(cloud: CloudSignals): GraphFragment {
  const nodes: SystemNode[] = (cloud.services ?? []).map((s) => ({
    id: s.id,
    kind: s.kind,
    name: s.name,
    provider: cloud.provider,
    region: s.region ?? cloud.regions?.[0],
    redundant: s.redundant,
  }));
  return { nodes, edges: [] };
}

export function databaseFragment(db: DatabaseSignals): GraphFragment {
  return {
    nodes: [
      {
        id: `db-${db.provider}-${slug(db.name)}`,
        kind: 'database',
        name: db.name,
        provider: db.provider,
        region: db.region,
        redundant: db.redundant ?? false,
        hasBackup: db.hasBackup,
      },
    ],
    edges: [],
  };
}

export function billingFragment(billing: BillingSignals): GraphFragment {
  return {
    nodes: [
      {
        id: 'stripe',
        kind: 'external_api',
        name: 'Stripe',
        provider: 'stripe',
        hasRateLimit: true,
        hasAuth: true,
      },
    ],
    edges: [],
  };
}

function detectRateLimit(repo: RepoSignals): boolean | undefined {
  const tokens = repo.dependencies.map((d) => d.toLowerCase());
  if (tokens.some((t) => /rate-limit|ratelimit|throttler|express-slow-down/.test(t)))
    return true;
  // Unknown — leave undefined rather than asserting "no rate limiting".
  return undefined;
}

function detectAuth(repo: RepoSignals): boolean | undefined {
  const tokens = [
    ...repo.dependencies.map((d) => d.toLowerCase()),
    ...(repo.envVars ?? []).map((e) => e.toLowerCase()),
  ];
  if (tokens.some((t) => /passport|next-auth|@supabase|jsonwebtoken|jose|clerk|auth0/.test(t)))
    return true;
  return undefined;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
