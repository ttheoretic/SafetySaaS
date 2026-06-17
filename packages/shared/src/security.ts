/**
 * Security Simulation Engine.
 *
 * Simulates common attack classes against the modeled system and produces a
 * security score 0–100 plus exposure findings. Like the reliability engine the
 * score is the aggregation of weighted findings.
 */

import { Finding, Severity, severityFromWeight } from './findings';
import { SystemGraph, SystemNode } from './model';

export type AttackType =
  | 'ddos'
  | 'credential_stuffing'
  | 'api_abuse'
  | 'rate_limit_bypass'
  | 'brute_force'
  | 'session_hijacking';

export interface SecurityResult {
  score: number; // 0..100
  findings: Finding[];
  exposures: { attack: AttackType; exposed: boolean; reason: string }[];
}

export function securitySimulation(graph: SystemGraph): SecurityResult {
  const findings: Finding[] = [];
  const exposures: SecurityResult['exposures'] = [];

  const publicApis = graph.nodes.filter(
    (n) => n.kind === 'api' || n.kind === 'external_api',
  );
  const hasCdn = graph.nodes.some((n) => n.kind === 'cdn');
  const noRateLimit = publicApis.filter((n) => n.hasRateLimit === false);
  const noAuth = publicApis.filter((n) => n.hasAuth === false);

  // DDoS: exposed if there's no CDN/edge protection in front of entrypoints.
  const ddosExposed = !hasCdn && publicApis.length > 0;
  exposures.push({
    attack: 'ddos',
    exposed: ddosExposed,
    reason: ddosExposed
      ? 'No CDN / edge layer in front of public entrypoints.'
      : 'CDN / edge protection present.',
  });
  if (ddosExposed)
    findings.push(mk('security', 16, 'No DDoS protection at the edge',
      'Public entrypoints are directly exposed without a CDN/WAF, making ' +
      'volumetric and L7 floods cheap to execute.'));

  // Rate-limit dependent attacks.
  for (const api of noRateLimit) {
    findings.push(mk('security', 10, `No rate limiting on ${api.name}`,
      `${api.name} can be hammered for credential stuffing, brute force and ` +
      `API abuse with no throttling.`, api.id));
  }

  const rateLimitExposed = noRateLimit.length > 0;
  exposures.push({
    attack: 'credential_stuffing',
    exposed: rateLimitExposed || noAuth.length > 0,
    reason: rateLimitExposed
      ? 'Endpoints without rate limiting allow high-volume login attempts.'
      : 'Rate limiting present on exposed endpoints.',
  });
  exposures.push({
    attack: 'brute_force',
    exposed: rateLimitExposed,
    reason: rateLimitExposed
      ? 'No throttling on authentication surfaces.'
      : 'Throttling in place.',
  });
  exposures.push({
    attack: 'api_abuse',
    exposed: rateLimitExposed,
    reason: rateLimitExposed
      ? 'Unmetered APIs can be scraped/abused.'
      : 'APIs are metered.',
  });
  exposures.push({
    attack: 'rate_limit_bypass',
    exposed: rateLimitExposed && !hasCdn,
    reason:
      rateLimitExposed && !hasCdn
        ? 'No centralized edge to enforce limits consistently.'
        : 'Limits enforced at a consistent layer.',
  });

  // Missing auth.
  for (const api of noAuth) {
    findings.push(mk('security', 14, `${api.name} lacks authentication`,
      `${api.name} is reachable without authentication, enabling direct ` +
      `data access and session-related attacks.`, api.id));
  }
  exposures.push({
    attack: 'session_hijacking',
    exposed: noAuth.length > 0,
    reason: noAuth.length
      ? 'Endpoints without auth weaken session integrity guarantees.'
      : 'Authenticated surfaces only.',
  });

  const penalty = findings.reduce((s, f) => s + f.weight, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return { score, findings: findings.sort((a, b) => b.weight - a.weight), exposures };
}

function mk(
  category: Finding['category'],
  weight: number,
  title: string,
  description: string,
  nodeId?: string,
): Finding {
  return {
    category,
    weight,
    title,
    description,
    nodeId,
    severity: severityFromWeight(weight),
  };
}

/* -------------------------------------------------------------------------- */
/* Attack Simulation                                                          */
/*                                                                            */
/* Interactive "what if we got attacked" scenarios the customer triggers from */
/* the Simulations page. Each runs against the modeled graph and produces a   */
/* concrete, deterministic exposure assessment — blast radius, the services   */
/* an attacker would reach, and the mitigations that would contain it.        */
/* -------------------------------------------------------------------------- */

export type AttackSimType =
  | 'ddos'
  | 'api_abuse'
  | 'credential_leak'
  | 'github_token_leak'
  | 'jwt_secret_leak';

export interface AttackSimResult {
  attack: AttackSimType;
  label: string;
  /** Is the modeled system actually exposed to this attack? */
  exposed: boolean;
  severity: Severity;
  /** Fraction of the system an attacker could reach / impact, 0..1. */
  blastRadius: number;
  affectedNodeIds: string[];
  /** How the attack reaches the system. */
  vector: string;
  /** What happens if it succeeds. */
  summary: string;
  /** Concrete mitigations that would contain or prevent it. */
  mitigations: string[];
}

export const ATTACK_SIMULATIONS: { type: AttackSimType; label: string }[] = [
  { type: 'ddos', label: 'DDoS' },
  { type: 'api_abuse', label: 'API Abuse' },
  { type: 'credential_leak', label: 'Credential Leak' },
  { type: 'github_token_leak', label: 'GitHub Token Leak' },
  { type: 'jwt_secret_leak', label: 'JWT Secret Leak' },
];

/** Nodes reachable downstream from a set of starting nodes (BFS over edges). */
function downstream(graph: SystemGraph, startIds: string[]): Set<string> {
  const seen = new Set<string>(startIds);
  const queue = [...startIds];
  while (queue.length) {
    const id = queue.shift()!;
    for (const e of graph.edges) {
      if (e.from === id && !seen.has(e.to)) {
        seen.add(e.to);
        queue.push(e.to);
      }
    }
  }
  return seen;
}

const isEntrypoint = (n: SystemNode) => n.kind === 'frontend' || n.kind === 'cdn' || n.kind === 'dns';
const isPublicApi = (n: SystemNode) => n.kind === 'api' || n.kind === 'frontend';

export function attackSimulation(graph: SystemGraph, attack: AttackSimType): AttackSimResult {
  const label = ATTACK_SIMULATIONS.find((a) => a.type === attack)?.label ?? attack;
  const total = Math.max(graph.nodes.length, 1);
  const hasEdgeShield = graph.nodes.some(
    (n) => n.provider === 'cloudflare' || n.kind === 'cdn',
  );
  const databases = graph.nodes.filter((n) => n.kind === 'database' || n.kind === 'storage');
  const authNodes = graph.nodes.filter((n) => n.hasAuth || n.kind === 'api');

  const radius = (ids: Set<string> | string[]) =>
    Math.min(1, (Array.isArray(ids) ? ids.length : ids.size) / total);

  switch (attack) {
    case 'ddos': {
      const entry = graph.nodes.filter(isEntrypoint);
      const unprotected = entry.filter((n) => !n.hasRateLimit) ;
      const exposed = !hasEdgeShield && unprotected.length > 0;
      const affected = exposed
        ? [...downstream(graph, entry.map((n) => n.id))]
        : entry.map((n) => n.id);
      return {
        attack, label, exposed,
        severity: exposed ? 'high' : 'low',
        blastRadius: exposed ? radius(affected) : 0.15,
        affectedNodeIds: affected,
        vector: 'Volumetric flood against public entrypoints (frontend / DNS / CDN).',
        summary: exposed
          ? 'No edge protection (CDN/Cloudflare) or rate limiting fronts your ' +
            'entrypoints — a flood saturates them and cascades to everything ' +
            'behind them.'
          : 'Edge protection / rate limiting absorbs the flood; impact stays at ' +
            'the edge and core services keep serving.',
        mitigations: [
          'Front public entrypoints with a CDN / Cloudflare with DDoS protection',
          'Enable rate limiting and connection limits at the edge',
          'Add autoscaling and request shedding for graceful degradation',
        ],
      };
    }
    case 'api_abuse': {
      const apis = graph.nodes.filter(isPublicApi);
      const unlimited = apis.filter((n) => !n.hasRateLimit);
      const exposed = unlimited.length > 0;
      const affected = exposed
        ? [...downstream(graph, unlimited.map((n) => n.id))]
        : apis.map((n) => n.id);
      return {
        attack, label, exposed,
        severity: exposed ? (databases.length ? 'critical' : 'high') : 'low',
        blastRadius: exposed ? radius(affected) : 0.1,
        affectedNodeIds: affected,
        vector: 'Automated, high-volume calls to expensive / unauthenticated API routes.',
        summary: exposed
          ? `${unlimited.length} API surface(s) lack rate limiting — scrapers and ` +
            'abusive clients can exhaust capacity and hammer downstream databases.'
          : 'APIs are rate limited; abusive traffic is throttled before it reaches ' +
            'your data layer.',
        mitigations: [
          'Enforce per-key / per-IP rate limits and quotas on every public route',
          'Require authentication on data-returning endpoints',
          'Add bot detection and anomaly-based throttling',
        ],
      };
    }
    case 'credential_leak': {
      const weakAuth = authNodes.filter((n) => !n.hasRateLimit);
      const exposed = weakAuth.length > 0 || authNodes.some((n) => !n.hasAuth);
      const affected = [
        ...downstream(graph, authNodes.map((n) => n.id)),
        ...databases.map((n) => n.id),
      ];
      return {
        attack, label, exposed,
        severity: exposed && databases.length ? 'critical' : exposed ? 'high' : 'low',
        blastRadius: exposed ? radius(new Set(affected)) : 0.1,
        affectedNodeIds: [...new Set(affected)],
        vector: 'Leaked user credentials replayed via credential stuffing against login.',
        summary: exposed
          ? 'Login lacks rate limiting / MFA enforcement — leaked credentials can ' +
            'be replayed at scale, granting access to user data in your databases.'
          : 'Login is rate limited and protected; replayed credentials are blocked ' +
            'before account takeover.',
        mitigations: [
          'Rate limit and lock out repeated failed logins',
          'Enforce MFA and breached-password detection',
          'Rotate exposed credentials and monitor for anomalous logins',
        ],
      };
    }
    case 'github_token_leak': {
      const sourceProviders = graph.nodes.filter(
        (n) => n.provider === 'github' || n.provider === 'gitlab' || n.provider === 'bitbucket',
      );
      // Anything you build and deploy is reachable by a CI/CD token: your own
      // frontends, APIs and services (plus anything self-hosted).
      const shipped = graph.nodes.filter(
        (n) => n.kind === 'frontend' || n.kind === 'api' || n.kind === 'service' || n.provider === 'self',
      );
      // A leaked CI/CD token is a supply-chain key: it can push code and deploy,
      // so the practical blast radius is the whole shipped system.
      const exposed = sourceProviders.length > 0 || shipped.length > 0;
      const affected = graph.nodes.map((n) => n.id);
      return {
        attack, label, exposed,
        severity: 'critical',
        blastRadius: exposed ? 1 : 0.2,
        affectedNodeIds: exposed ? affected : [],
        vector: 'CI/CD or repo access token leaked in logs, history or a public repo.',
        summary: exposed
          ? 'A leaked GitHub/CI token is a supply-chain key — an attacker can push ' +
            'malicious code and trigger deploys, compromising every service you ship.'
          : 'No connected source/CI provider was detected, so this vector does not ' +
            'currently apply.',
        mitigations: [
          'Store tokens in a secrets manager; never in code, logs or CI variables in plaintext',
          'Scope tokens to least privilege and short TTLs; rotate regularly',
          'Enable secret scanning and push protection on every repository',
          'Require signed commits and protected branches for deploys',
        ],
      };
    }
    case 'jwt_secret_leak': {
      const issuers = authNodes;
      const exposed = issuers.length > 0;
      // Forged tokens grant access to everything behind auth.
      const affected = [
        ...downstream(graph, issuers.map((n) => n.id)),
        ...databases.map((n) => n.id),
      ];
      return {
        attack, label, exposed,
        severity: 'critical',
        blastRadius: exposed ? radius(new Set(affected)) : 0.2,
        affectedNodeIds: exposed ? [...new Set(affected)] : [],
        vector: 'Leaked JWT signing secret used to forge valid tokens for any user.',
        summary: exposed
          ? 'With the signing secret an attacker forges tokens for any account, ' +
            'including admins — full authentication bypass across every service ' +
            'that trusts those tokens.'
          : 'No token-issuing service was detected, so this vector does not ' +
            'currently apply.',
        mitigations: [
          'Move signing keys to a KMS / secrets manager and rotate them',
          'Use asymmetric (RS256) signing so verifiers never hold the signing key',
          'Add short token TTLs plus revocation, and alert on key access',
        ],
      };
    }
  }
}
