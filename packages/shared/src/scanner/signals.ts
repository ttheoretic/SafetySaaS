/**
 * Normalized provider signals.
 *
 * Collectors (which do I/O, in the API) fetch raw data from each provider and
 * reduce it to these plain, serializable signal objects. The scanner then
 * turns signals into a SystemGraph — purely and deterministically, so the
 * transformation is fully unit-testable without touching the network.
 */

import { NodeKind, ProviderId } from '../model';

export type CodeHost = 'github' | 'gitlab' | 'bitbucket';

/** A scanned code repository. */
export interface RepoSignals {
  provider: CodeHost;
  /** "owner/name". */
  repo: string;
  /** Declared dependencies (package.json, requirements.txt, go.mod, …). */
  dependencies: string[];
  /** Detected application frameworks, e.g. 'nextjs', 'nestjs', 'express'. */
  frameworks?: string[];
  /** Environment variable names (values never collected) — hint integrations. */
  envVars?: string[];
  hasDockerfile?: boolean;
  hasKubernetes?: boolean;
  /** Detected IaC tooling, e.g. 'terraform', 'serverless', 'pulumi'. */
  iac?: string[];
  /** Where the app appears to be deployed, if derivable. */
  hostProvider?: ProviderId;
  /** Known vulnerabilities in this repo's resolved dependency tree (SCA). */
  vulnerabilities?: import('../vulnerabilities').DependencyVulnerability[];
  /** Code-level security findings (committed secrets, insecure config, …). */
  codeFindings?: import('../findings').Finding[];
}

/** A cloud/hosting account and its notable resources. */
export interface CloudSignals {
  provider: ProviderId; // aws | azure | gcp | vercel | railway | render
  regions?: string[];
  services?: Array<{
    id: string;
    name: string;
    kind: NodeKind;
    region?: string;
    redundant?: boolean;
  }>;
}

/** A managed database provider. */
export interface DatabaseSignals {
  provider: ProviderId; // supabase | neon
  name: string;
  region?: string;
  redundant?: boolean;
  hasBackup?: boolean;
}

/** Billing provider (Stripe). */
export interface BillingSignals {
  provider: 'stripe';
  live: boolean;
}

/** Everything collected for one scan. */
export interface ScanCollection {
  repos?: RepoSignals[];
  clouds?: CloudSignals[];
  databases?: DatabaseSignals[];
  billing?: BillingSignals[];
}

/**
 * Dependency / env-var → backing-service inference table.
 *
 * Maps a (lowercased) package or env-var token to the kind of system node it
 * implies and how it should be represented. This is the core of "understanding
 * an architecture from its code".
 */
export interface ServiceHint {
  /** Substring matched against dependency / env names (lowercased). */
  match: RegExp;
  id: string;
  name: string;
  kind: NodeKind;
  provider?: ProviderId;
  /** Default attributes applied to the inferred node. */
  defaults?: {
    hasBackup?: boolean;
    hasRateLimit?: boolean;
    redundant?: boolean;
    hasAuth?: boolean;
  };
}

export const SERVICE_HINTS: ServiceHint[] = [
  // Databases
  { match: /\b(pg|postgres|postgresql|prisma|typeorm|sequelize|knex)\b/, id: 'postgres', name: 'PostgreSQL', kind: 'database', defaults: { hasBackup: false, redundant: false } },
  { match: /\b(mysql|mysql2|mariadb)\b/, id: 'mysql', name: 'MySQL', kind: 'database', defaults: { hasBackup: false, redundant: false } },
  { match: /\b(mongodb|mongoose)\b/, id: 'mongo', name: 'MongoDB', kind: 'database', defaults: { hasBackup: false, redundant: false } },
  { match: /\b(neon)\b/, id: 'neon', name: 'Neon Postgres', kind: 'database', provider: 'neon', defaults: { hasBackup: true, redundant: false } },
  { match: /\b(supabase|@supabase)\b/, id: 'supabase-db', name: 'Supabase', kind: 'database', provider: 'supabase', defaults: { hasBackup: true } },
  // Caches
  { match: /\b(redis|ioredis)\b/, id: 'redis', name: 'Redis', kind: 'cache', defaults: { redundant: false } },
  { match: /\b(memcached)\b/, id: 'memcached', name: 'Memcached', kind: 'cache', defaults: { redundant: false } },
  // Queues
  { match: /\b(bullmq|bull|amqplib|rabbitmq|kafkajs|sqs)\b/, id: 'queue', name: 'Job Queue', kind: 'queue', defaults: { redundant: false } },
  // External APIs
  { match: /\b(stripe)\b/, id: 'stripe', name: 'Stripe', kind: 'external_api', provider: 'stripe', defaults: { hasRateLimit: true, hasAuth: true } },
  { match: /\b(openai)\b/, id: 'openai', name: 'OpenAI', kind: 'external_api', provider: 'openai', defaults: { hasRateLimit: true, hasAuth: true } },
  { match: /\b(@anthropic-ai|anthropic)\b/, id: 'anthropic', name: 'Anthropic', kind: 'external_api', provider: 'self', defaults: { hasRateLimit: true, hasAuth: true } },
  { match: /\b(sendgrid|resend|postmark|nodemailer|mailgun)\b/, id: 'email', name: 'Email Provider', kind: 'external_api', defaults: { hasRateLimit: true, hasAuth: true } },
  { match: /\b(twilio)\b/, id: 'twilio', name: 'Twilio', kind: 'external_api', defaults: { hasRateLimit: true, hasAuth: true } },
  // CDN / edge
  { match: /\b(cloudflare|@cloudflare)\b/, id: 'cloudflare', name: 'Cloudflare', kind: 'cdn', provider: 'cloudflare', defaults: { redundant: true } },
  // Storage
  { match: /\b(aws-sdk|@aws-sdk|s3)\b/, id: 's3', name: 'Object Storage (S3)', kind: 'storage', provider: 'aws', defaults: { hasBackup: true, redundant: true } },
  { match: /\b(cloudinary)\b/, id: 'cloudinary', name: 'Cloudinary', kind: 'storage', defaults: { hasBackup: true, redundant: true } },
  { match: /@google-cloud\/storage|\bgcs\b/, id: 'gcs', name: 'Google Cloud Storage', kind: 'storage', provider: 'gcp', defaults: { hasBackup: true, redundant: true } },
  // Vector databases
  { match: /\b(pinecone|@pinecone)\b/, id: 'pinecone', name: 'Pinecone', kind: 'database', defaults: { hasBackup: true } },
  { match: /\b(weaviate)\b/, id: 'weaviate', name: 'Weaviate', kind: 'database', defaults: { hasBackup: false } },
  { match: /\b(qdrant)\b/, id: 'qdrant', name: 'Qdrant', kind: 'database', defaults: { hasBackup: false } },
  // Search
  { match: /\b(algoliasearch|algolia)\b/, id: 'algolia', name: 'Algolia', kind: 'external_api', defaults: { hasRateLimit: true, hasAuth: true } },
  { match: /@elastic|\belasticsearch\b/, id: 'elasticsearch', name: 'Elasticsearch', kind: 'service', defaults: { redundant: false } },
  { match: /\b(meilisearch)\b/, id: 'meilisearch', name: 'Meilisearch', kind: 'service', defaults: { redundant: false } },
  { match: /\b(typesense)\b/, id: 'typesense', name: 'Typesense', kind: 'service', defaults: { redundant: false } },
  // Auth
  { match: /\b(@clerk|clerk)\b/, id: 'clerk', name: 'Clerk', kind: 'external_api', defaults: { hasRateLimit: true, hasAuth: true } },
  { match: /\b(auth0|@auth0)\b/, id: 'auth0', name: 'Auth0', kind: 'external_api', defaults: { hasRateLimit: true, hasAuth: true } },
  { match: /\b(firebase|firebase-admin|@firebase)\b/, id: 'firebase', name: 'Firebase', kind: 'external_api', provider: 'gcp', defaults: { hasRateLimit: true, hasAuth: true } },
  // Monitoring / observability
  { match: /@sentry|\bsentry\b/, id: 'sentry', name: 'Sentry', kind: 'external_api', defaults: { hasRateLimit: true, hasAuth: true } },
  { match: /\b(datadog|dd-trace|@datadog)\b/, id: 'datadog', name: 'Datadog', kind: 'external_api', defaults: { hasRateLimit: true, hasAuth: true } },
  { match: /\b(newrelic|new-relic)\b/, id: 'newrelic', name: 'New Relic', kind: 'external_api', defaults: { hasRateLimit: true, hasAuth: true } },
  // Analytics
  { match: /\b(posthog|posthog-js|posthog-node)\b/, id: 'posthog', name: 'PostHog', kind: 'external_api', defaults: { hasRateLimit: true, hasAuth: true } },
  { match: /@segment|\bsegment\b|analytics-node/, id: 'segment', name: 'Segment', kind: 'external_api', defaults: { hasRateLimit: true, hasAuth: true } },
  { match: /\b(mixpanel|amplitude)\b/, id: 'product-analytics', name: 'Product Analytics', kind: 'external_api', defaults: { hasRateLimit: true, hasAuth: true } },
  // Feature flags
  { match: /\b(launchdarkly|@launchdarkly|unleash|flagsmith)\b/, id: 'feature-flags', name: 'Feature Flags', kind: 'external_api', defaults: { hasRateLimit: true, hasAuth: true } },
  // Payments (beyond Stripe)
  { match: /\b(paddle|@paddle|braintree)\b/, id: 'payments', name: 'Payments Provider', kind: 'external_api', defaults: { hasRateLimit: true, hasAuth: true } },
];
