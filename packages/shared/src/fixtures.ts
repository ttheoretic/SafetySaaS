import { SystemGraph, BusinessContext } from './model';

/**
 * A representative example system, matching the spec's illustration:
 *
 *   Frontend → API → Database
 *                 ↘ Stripe
 *
 * Used in tests, the API seed and as the default demo project.
 */
export const exampleGraph: SystemGraph = {
  nodes: [
    { id: 'fe', kind: 'frontend', name: 'Next.js Frontend', provider: 'vercel', redundant: true },
    {
      id: 'api',
      kind: 'api',
      name: 'NestJS API',
      provider: 'railway',
      redundant: false,
      hasRateLimit: false,
      hasAuth: true,
      requestsPerMinute: 6000,
    },
    {
      id: 'db',
      kind: 'database',
      name: 'PostgreSQL',
      provider: 'neon',
      redundant: false,
      hasBackup: false,
    },
    { id: 'cache', kind: 'cache', name: 'Redis', provider: 'railway', redundant: false },
    {
      id: 'stripe',
      kind: 'external_api',
      name: 'Stripe',
      provider: 'stripe',
      hasRateLimit: true,
      hasAuth: true,
    },
  ],
  edges: [
    { from: 'fe', to: 'api', criticality: 1 },
    { from: 'api', to: 'db', criticality: 1 },
    { from: 'api', to: 'cache', criticality: 0.6 },
    { from: 'api', to: 'stripe', criticality: 0.7 },
  ],
};

export const exampleBusiness: BusinessContext = {
  monthlyRevenue: 50000,
  activeUsers: 4000,
  peakCheckoutShare: 0.17,
  slaCreditRatePerHour: 0.01,
  currency: 'EUR',
};
