/**
 * Integration catalog — the single source of truth for which third-party
 * systems Riscly can connect to, how you authenticate, and what each one
 * discovers about your architecture. Drives the Connect UI and documents the
 * roadmap. Keep `status` honest:
 *   - 'live'    : real API discovery is implemented and runs on every scan
 *   - 'beta'    : connectable today, topology described via declared metadata
 *                 (a real inventory API can later slot into its collector)
 *   - 'planned' : scaffolded (auth/registry ready) but no collector yet
 */

export type IntegrationCategory =
  | 'code'
  | 'hosting'
  | 'cloud'
  | 'database'
  | 'payments'
  | 'edge'
  | 'observability';

/** How a connection is established. */
export type IntegrationAuth = 'oauth' | 'token' | 'role' | 'planned';

export type IntegrationStatus = 'live' | 'beta' | 'planned';

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  auth: IntegrationAuth;
  status: IntegrationStatus;
  /** Short, human-readable list of what connecting this surfaces. */
  discovers: string[];
}

export const INTEGRATION_CATEGORIES: { key: IntegrationCategory; label: string }[] = [
  { key: 'code', label: 'Code & CI' },
  { key: 'hosting', label: 'Hosting & Deployments' },
  { key: 'cloud', label: 'Cloud Infrastructure' },
  { key: 'database', label: 'Databases' },
  { key: 'payments', label: 'Payments & Revenue' },
  { key: 'edge', label: 'Edge & CDN' },
  { key: 'observability', label: 'Observability' },
];

export const INTEGRATIONS: Integration[] = [
  // ---- Code & CI ----
  { id: 'github', name: 'GitHub', category: 'code', auth: 'oauth', status: 'live',
    discovers: ['Repos & dependencies', 'Frameworks (Next.js, Nest, …)', 'Dockerfile / Kubernetes', 'Auth & rate-limit libraries'] },
  { id: 'gitlab', name: 'GitLab', category: 'code', auth: 'oauth', status: 'planned',
    discovers: ['Repos & dependencies', 'CI pipelines'] },
  { id: 'bitbucket', name: 'Bitbucket', category: 'code', auth: 'oauth', status: 'planned',
    discovers: ['Repos & dependencies', 'Pipelines'] },

  // ---- Hosting & Deployments ----
  { id: 'vercel', name: 'Vercel', category: 'hosting', auth: 'token', status: 'live',
    discovers: ['Projects & domains', 'Regions', 'Edge redundancy'] },
  { id: 'railway', name: 'Railway', category: 'hosting', auth: 'token', status: 'beta',
    discovers: ['Services & environments', 'Region', 'Replicas'] },
  { id: 'render', name: 'Render', category: 'hosting', auth: 'token', status: 'beta',
    discovers: ['Services', 'Region', 'Autoscaling'] },
  { id: 'netlify', name: 'Netlify', category: 'hosting', auth: 'token', status: 'planned',
    discovers: ['Sites & functions', 'Edge'] },

  // ---- Cloud Infrastructure ----
  { id: 'aws', name: 'Amazon Web Services', category: 'cloud', auth: 'role', status: 'beta',
    discovers: ['Regions & AZs', 'Compute / DB / queues', 'Redundancy'] },
  { id: 'gcp', name: 'Google Cloud', category: 'cloud', auth: 'role', status: 'beta',
    discovers: ['Regions', 'Services', 'Redundancy'] },
  { id: 'azure', name: 'Microsoft Azure', category: 'cloud', auth: 'role', status: 'beta',
    discovers: ['Regions', 'Services', 'Redundancy'] },

  // ---- Databases ----
  { id: 'supabase', name: 'Supabase', category: 'database', auth: 'token', status: 'beta',
    discovers: ['Database & region', 'Backups', 'Read replicas'] },
  { id: 'neon', name: 'Neon', category: 'database', auth: 'token', status: 'beta',
    discovers: ['Database & region', 'Branches', 'Backups'] },
  { id: 'planetscale', name: 'PlanetScale', category: 'database', auth: 'token', status: 'planned',
    discovers: ['Database & region', 'Replicas'] },
  { id: 'mongodb', name: 'MongoDB Atlas', category: 'database', auth: 'token', status: 'planned',
    discovers: ['Clusters & region', 'Backups'] },

  // ---- Payments & Revenue ----
  { id: 'stripe', name: 'Stripe', category: 'payments', auth: 'token', status: 'live',
    discovers: ['Live/test status', 'MRR & active subscriptions', 'Checkout dependency'] },

  // ---- Edge & CDN ----
  { id: 'cloudflare', name: 'Cloudflare', category: 'edge', auth: 'token', status: 'planned',
    discovers: ['DNS & proxy', 'WAF / DDoS protection', 'Edge caching'] },

  // ---- Observability (load & traffic signals) ----
  { id: 'datadog', name: 'Datadog', category: 'observability', auth: 'token', status: 'planned',
    discovers: ['Request rates (RPM)', 'Latency & error rates', 'Service map'] },
  { id: 'sentry', name: 'Sentry', category: 'observability', auth: 'token', status: 'planned',
    discovers: ['Error volume', 'Throughput', 'Releases'] },
];

/** Providers a user can actually connect today (live or beta). */
export const CONNECTABLE_PROVIDERS = INTEGRATIONS
  .filter((i) => i.status !== 'planned')
  .map((i) => i.id);

export function integrationsByCategory(): Record<IntegrationCategory, Integration[]> {
  const out = {} as Record<IntegrationCategory, Integration[]>;
  for (const { key } of INTEGRATION_CATEGORIES) out[key] = [];
  for (const i of INTEGRATIONS) (out[i.category] ??= []).push(i);
  return out;
}
