import type { Severity } from '@/lib/riscly-data'

export type SecurityDomain = 'sast' | 'sca' | 'secrets' | 'iac'

export const domains: {
  id: SecurityDomain
  label: string
  short: string
  desc: string
  total: number
  bySeverity: Record<Severity, number>
}[] = [
  {
    id: 'sast',
    label: 'Static Code (SAST)',
    short: 'SAST',
    desc: 'Vulnerabilities in your first-party source code',
    total: 187,
    bySeverity: { critical: 52, high: 49, medium: 84, low: 2 },
  },
  {
    id: 'sca',
    label: 'Libraries (SCA)',
    short: 'SCA',
    desc: 'Known CVEs in your open-source dependencies',
    total: 265,
    bySeverity: { critical: 31, high: 88, medium: 121, low: 25 },
  },
  {
    id: 'secrets',
    label: 'Secret Scanning',
    short: 'Secrets',
    desc: 'Leaked credentials, tokens and keys in code',
    total: 14,
    bySeverity: { critical: 6, high: 5, medium: 3, low: 0 },
  },
  {
    id: 'iac',
    label: 'Infrastructure (IaC)',
    short: 'IaC',
    desc: 'Misconfigurations in Terraform, K8s and Docker',
    total: 43,
    bySeverity: { critical: 4, high: 17, medium: 19, low: 3 },
  },
]

// Funnel from default branch down to actively exposed in production
export type FunnelStage = {
  id: string
  label: string
  desc: string
  count: number
}

export const funnel: FunnelStage[] = [
  { id: 'branch', label: 'Default branch', desc: 'All open findings on main', count: 509 },
  { id: 'prod', label: 'In production', desc: 'Reachable in a deployed service', count: 178 },
  { id: 'exploit', label: 'Exploit available', desc: 'Public PoC or weaponized exploit', count: 41 },
  { id: 'exposed', label: 'Internet exposed', desc: 'On an internet-facing path', count: 12 },
]

export type GroupRow = {
  name: string
  meta: string
  critical: number
  high: number
  medium: number
}

export const byService: GroupRow[] = [
  { name: 'auth-gateway', meta: 'Node.js · platform', critical: 4, high: 9, medium: 12 },
  { name: 'orders-db', meta: 'PostgreSQL · commerce', critical: 3, high: 6, medium: 8 },
  { name: 'return-completion', meta: 'Python · commerce', critical: 2, high: 7, medium: 14 },
  { name: 'log-forwarder', meta: 'Go · observability', critical: 1, high: 4, medium: 6 },
  { name: 'post-coupon', meta: 'Node.js · growth', critical: 1, high: 8, medium: 9 },
  { name: 'sms-service', meta: 'Python · notifications', critical: 0, high: 5, medium: 4 },
]

export const byLibrary: GroupRow[] = [
  { name: 'log4j:log4j', meta: 'Java · 15 repositories · CVE-2021-44228', critical: 12, high: 3, medium: 0 },
  { name: 'jackson-databind', meta: 'Java · 13 repositories', critical: 6, high: 9, medium: 4 },
  { name: 'spring-beans', meta: 'Java · 11 repositories · CVE-2022-22965', critical: 5, high: 7, medium: 2 },
  { name: 'gson', meta: 'Java · 10 repositories', critical: 2, high: 8, medium: 11 },
  { name: 'urllib3', meta: 'Python · 9 repositories', critical: 1, high: 5, medium: 9 },
  { name: 'lodash', meta: 'JavaScript · 8 repositories', critical: 0, high: 6, medium: 7 },
]

export const byTeam: GroupRow[] = [
  { name: 'Commerce', meta: '8 services · 4 repositories', critical: 8, high: 19, medium: 26 },
  { name: 'Platform', meta: '6 services · 5 repositories', critical: 6, high: 14, medium: 18 },
  { name: 'Growth', meta: '4 services · 3 repositories', critical: 3, high: 11, medium: 13 },
  { name: 'Observability', meta: '3 services · 2 repositories', critical: 1, high: 6, medium: 9 },
]

export type SecurityIssue = {
  id: string
  title: string
  severity: Severity
  domain: SecurityDomain
  rule: string
  location: string
  service: string
  inProduction: boolean
  exploitAvailable: boolean
  exposed: boolean
  cve?: string
  /** Short description of the risk. */
  description?: string
  /** Recommended remediation. */
  fix?: string
}

export const securityIssues: SecurityIssue[] = [
  {
    id: 'SEC-401',
    title: 'Remote code execution via Log4Shell',
    severity: 'critical',
    domain: 'sca',
    rule: 'CVE-2021-44228',
    location: 'pom.xml · log4j-core 2.14.1',
    service: 'auth-gateway',
    inProduction: true,
    exploitAvailable: true,
    exposed: true,
    cve: 'CVE-2021-44228',
  },
  {
    id: 'SEC-402',
    title: 'Hardcoded AWS secret access key',
    severity: 'critical',
    domain: 'secrets',
    rule: 'secrets/aws-access-key',
    location: 'scripts/deploy/sync.py:12',
    service: 'log-forwarder',
    inProduction: true,
    exploitAvailable: true,
    exposed: false,
  },
  {
    id: 'SEC-403',
    title: 'SQL injection in order lookup',
    severity: 'critical',
    domain: 'sast',
    rule: 'python-security/sql-injection',
    location: 'orders/queries.py:88',
    service: 'orders-db',
    inProduction: true,
    exploitAvailable: false,
    exposed: true,
  },
  {
    id: 'SEC-404',
    title: 'Request without timeout can hang worker',
    severity: 'high',
    domain: 'sast',
    rule: 'python-security/requests-timeout',
    location: 'dogmover/dogmover.py:318',
    service: 'return-completion',
    inProduction: true,
    exploitAvailable: false,
    exposed: false,
  },
  {
    id: 'SEC-405',
    title: 'S3 bucket allows public read access',
    severity: 'high',
    domain: 'iac',
    rule: 'terraform/s3-public-read',
    location: 'infra/storage.tf:24',
    service: 'post-coupon',
    inProduction: true,
    exploitAvailable: false,
    exposed: true,
  },
  {
    id: 'SEC-406',
    title: 'Deserialization of untrusted data',
    severity: 'critical',
    domain: 'sca',
    rule: 'CVE-2022-22965',
    location: 'pom.xml · spring-beans 5.3.18',
    service: 'auth-gateway',
    inProduction: true,
    exploitAvailable: true,
    exposed: false,
    cve: 'CVE-2022-22965',
  },
  {
    id: 'SEC-407',
    title: 'Missing rate limiting on login endpoint',
    severity: 'high',
    domain: 'sast',
    rule: 'javascript-security/no-rate-limit',
    location: 'gateway/routes/auth.ts:54',
    service: 'auth-gateway',
    inProduction: true,
    exploitAvailable: false,
    exposed: true,
  },
  {
    id: 'SEC-408',
    title: 'Container runs as root user',
    severity: 'medium',
    domain: 'iac',
    rule: 'docker/no-root-user',
    location: 'Dockerfile:1',
    service: 'sms-service',
    inProduction: false,
    exploitAvailable: false,
    exposed: false,
  },
  {
    id: 'SEC-409',
    title: 'Slack webhook token committed to repo',
    severity: 'critical',
    domain: 'secrets',
    rule: 'secrets/slack-webhook',
    location: 'config/alerts.yaml:7',
    service: 'log-forwarder',
    inProduction: false,
    exploitAvailable: false,
    exposed: false,
  },
  {
    id: 'SEC-410',
    title: 'Prototype pollution in lodash merge',
    severity: 'high',
    domain: 'sca',
    rule: 'CVE-2020-8203',
    location: 'package.json · lodash 4.17.15',
    service: 'post-coupon',
    inProduction: true,
    exploitAvailable: true,
    exposed: false,
    cve: 'CVE-2020-8203',
  },
]

export const exposureStats = {
  exploitable: 41,
  exposed: 12,
  fixAvailable: 318,
  meanTimeToRemediate: '6.2d',
}
