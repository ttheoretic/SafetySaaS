export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type HealthStatus = 'ok' | 'warn' | 'critical'

export type RiskCategory =
  | 'Security'
  | 'Code'
  | 'Infrastructure'
  | 'Performance'
  | 'Dependency'
  | 'Reliability'

export const project = {
  name: 'shopist-platform',
  org: 'riscly',
  branch: 'main',
  riskScore: 68,
  riskTrend: -4,
}

export const severityOrder: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export type Risk = {
  id: string
  title: string
  category: RiskCategory
  severity: Severity
  description: string
  impact: string
  components: string[]
  file?: string
  line?: number
  rule?: string
  /** How trustworthy this finding is: verified > high (AST) > heuristic (regex). */
  confidence?: 'verified' | 'high' | 'heuristic'
  exploitAvailable?: boolean
  inProduction?: boolean
  fix: string
  status: 'open' | 'in-progress' | 'fixed'
  /** Estimated reliability gain from applying the fix. */
  riskReductionPct?: number
  /** Cited best-practice references grounding the fix. */
  references?: { title: string; source: string; url: string }[]
}

export const risks: Risk[] = [
  {
    id: 'RSK-1042',
    title: 'HTTP request without timeout',
    category: 'Code',
    severity: 'critical',
    description:
      'requests.post() is called without a timeout, allowing the worker to hang indefinitely when the Synthetics API is unresponsive.',
    impact:
      'A single slow upstream response can exhaust the worker pool and cascade into a full service outage.',
    components: ['dogmover', 'synthetics-api'],
    file: 'scripts/dogmover/dogmover.py',
    line: 318,
    rule: 'python-security/requests-timeout',
    exploitAvailable: false,
    inProduction: true,
    fix: 'Add timeout=10 to the request and wrap it in a try/except for requests.exceptions.Timeout.',
    status: 'open',
  },
  {
    id: 'RSK-1039',
    title: 'Publicly exposed Postgres instance',
    category: 'Infrastructure',
    severity: 'critical',
    description:
      'Security group sg-0a91 allows inbound 5432 from 0.0.0.0/0 on the orders database.',
    impact:
      'Customer order data is reachable from the public internet without an allow-list.',
    components: ['orders-db', 'vpc-prod'],
    file: 'infra/terraform/rds.tf',
    line: 54,
    rule: 'terraform/public-db',
    exploitAvailable: true,
    inProduction: true,
    fix: 'Restrict ingress to the application subnet CIDR and enable IAM database authentication.',
    status: 'open',
  },
  {
    id: 'RSK-1031',
    title: 'log4j 2.14 — Remote Code Execution (CVE-2021-44228)',
    category: 'Dependency',
    severity: 'critical',
    description:
      'log4j-core 2.14.1 is vulnerable to JNDI lookup injection enabling remote code execution.',
    impact:
      'Attacker-controlled log strings can execute arbitrary code on the log-forwarder service.',
    components: ['log-forwarder'],
    file: 'pom.xml',
    line: 88,
    rule: 'sca/cve-2021-44228',
    exploitAvailable: true,
    inProduction: true,
    fix: 'Upgrade log4j-core to 2.17.1 or later.',
    status: 'open',
  },
  {
    id: 'RSK-1028',
    title: 'Hardcoded API key in source',
    category: 'Security',
    severity: 'high',
    description:
      'A Datadog application key is committed in plaintext inside the configuration loader.',
    impact:
      'Anyone with repository read access can exfiltrate the credential and impersonate the service.',
    components: ['post-coupon'],
    file: 'src/config/keys.py',
    line: 12,
    rule: 'secrets/generic-api-key',
    exploitAvailable: false,
    inProduction: false,
    fix: 'Move the key to a secret manager and reference it through an environment variable.',
    status: 'open',
  },
  {
    id: 'RSK-1021',
    title: 'Missing rate limiting on auth endpoint',
    category: 'Security',
    severity: 'high',
    description:
      '/api/v1/login has no rate limiting, leaving it open to credential stuffing.',
    impact: 'Enables brute-force and credential-stuffing attacks against user accounts.',
    components: ['sms-service', 'auth-gateway'],
    file: 'services/auth/routes.ts',
    line: 140,
    rule: 'api/rate-limit',
    exploitAvailable: false,
    inProduction: true,
    fix: 'Add a sliding-window rate limiter (e.g. 5 attempts / 15 min) keyed by IP and account.',
    status: 'in-progress',
  },
  {
    id: 'RSK-1014',
    title: 'N+1 query in order history',
    category: 'Performance',
    severity: 'high',
    description:
      'getOrderHistory issues one query per line item instead of a single joined query.',
    impact: 'p95 latency on the orders page exceeds 2.4s under load.',
    components: ['return-completion', 'orders-db'],
    file: 'services/orders/history.ts',
    line: 73,
    rule: 'perf/n-plus-one',
    exploitAvailable: false,
    inProduction: true,
    fix: 'Replace the per-item loop with a single JOIN and select only required columns.',
    status: 'open',
  },
  {
    id: 'RSK-1009',
    title: 'No retry budget on payment queue consumer',
    category: 'Reliability',
    severity: 'medium',
    description:
      'The payment consumer retries failed messages indefinitely with no dead-letter queue.',
    impact: 'Poison messages can block the queue and stall payment processing.',
    components: ['payments-queue', 'post-coupon'],
    file: 'services/payments/consumer.ts',
    line: 96,
    rule: 'reliability/dlq-missing',
    exploitAvailable: false,
    inProduction: true,
    fix: 'Cap retries at 5 and route exhausted messages to a dead-letter queue.',
    status: 'open',
  },
  {
    id: 'RSK-1004',
    title: 'Outdated jackson-databind dependency',
    category: 'Dependency',
    severity: 'medium',
    description:
      'jackson-databind 2.9.8 has known deserialization vulnerabilities.',
    impact: 'Potential deserialization gadget chains in the log-forwarder.',
    components: ['log-forwarder'],
    file: 'pom.xml',
    line: 102,
    rule: 'sca/jackson-databind',
    exploitAvailable: false,
    inProduction: false,
    fix: 'Upgrade jackson-databind to 2.15.x.',
    status: 'open',
  },
  {
    id: 'RSK-0998',
    title: 'Verbose error responses leak stack traces',
    category: 'Security',
    severity: 'low',
    description: 'Unhandled exceptions return full stack traces to the client.',
    impact: 'Discloses internal paths and library versions useful for reconnaissance.',
    components: ['sms-service'],
    file: 'services/sms/handler.ts',
    line: 44,
    rule: 'security/verbose-errors',
    exploitAvailable: false,
    inProduction: false,
    fix: 'Return a generic error payload and log the stack trace server-side only.',
    status: 'open',
  },
]

export type ServiceNode = {
  id: string
  label: string
  type: 'service' | 'database' | 'queue' | 'gateway' | 'external'
  x: number
  y: number
  severity: Severity | 'ok'
  riskCount: number
  tech: string
}

export type Edge = {
  from: string
  to: string
  severity: Severity | 'ok'
  label?: string
}

export const nodes: ServiceNode[] = [
  { id: 'cdn', label: 'Edge / CDN', type: 'external', x: 80, y: 200, severity: 'ok', riskCount: 0, tech: 'Cloudflare' },
  { id: 'gateway', label: 'auth-gateway', type: 'gateway', x: 280, y: 200, severity: 'high', riskCount: 1, tech: 'Kong' },
  { id: 'sms', label: 'sms-service', type: 'service', x: 500, y: 90, severity: 'high', riskCount: 2, tech: 'Node.js' },
  { id: 'orders', label: 'return-completion', type: 'service', x: 500, y: 200, severity: 'high', riskCount: 1, tech: 'Python' },
  { id: 'coupon', label: 'post-coupon', type: 'service', x: 500, y: 310, severity: 'high', riskCount: 2, tech: 'Python' },
  { id: 'queue', label: 'payments-queue', type: 'queue', x: 720, y: 310, severity: 'medium', riskCount: 1, tech: 'SQS' },
  { id: 'ordersdb', label: 'orders-db', type: 'database', x: 720, y: 200, severity: 'critical', riskCount: 2, tech: 'Postgres' },
  { id: 'logfwd', label: 'log-forwarder', type: 'service', x: 720, y: 90, severity: 'critical', riskCount: 2, tech: 'Java' },
  { id: 'synthetics', label: 'synthetics-api', type: 'external', x: 940, y: 90, severity: 'critical', riskCount: 1, tech: 'Datadog' },
]

export const edges: Edge[] = [
  { from: 'cdn', to: 'gateway', severity: 'ok' },
  { from: 'gateway', to: 'sms', severity: 'high', label: 'no rate limit' },
  { from: 'gateway', to: 'orders', severity: 'ok' },
  { from: 'gateway', to: 'coupon', severity: 'high' },
  { from: 'orders', to: 'ordersdb', severity: 'high', label: 'N+1' },
  { from: 'coupon', to: 'queue', severity: 'medium' },
  { from: 'coupon', to: 'ordersdb', severity: 'critical', label: 'public 5432' },
  { from: 'logfwd', to: 'synthetics', severity: 'critical', label: 'no timeout' },
  { from: 'sms', to: 'logfwd', severity: 'ok' },
]

export const healthMetrics = [
  { label: 'Security', status: 'critical' as HealthStatus, value: '3 critical', detail: 'Exploitable paths in production' },
  { label: 'Reliability', status: 'warn' as HealthStatus, value: '99.81%', detail: '70 pods in CrashLoopBackOff' },
  { label: 'Performance', status: 'warn' as HealthStatus, value: 'p95 2.4s', detail: 'Orders history regression' },
  { label: 'Dependencies', status: 'critical' as HealthStatus, value: '265 vulnerable', detail: '8 with known exploits' },
]

export const recentChanges = [
  { id: 'c1', author: 'm.tang', repo: 'orders-service', message: 'Refactor order history pagination', risk: 'high' as Severity, time: '12m ago', delta: '+1 risk' },
  { id: 'c2', author: 'd.ortiz', repo: 'infra-terraform', message: 'Open RDS to VPC peering range', risk: 'critical' as Severity, time: '1h ago', delta: '+1 risk' },
  { id: 'c3', author: 'a.lin', repo: 'log-forwarder', message: 'Bump base image to eclipse-temurin:17', risk: 'medium' as Severity, time: '3h ago', delta: '-2 risks' },
  { id: 'c4', author: 'k.rao', repo: 'sms-service', message: 'Add structured logging middleware', risk: 'low' as Severity, time: '5h ago', delta: 'no change' },
]
