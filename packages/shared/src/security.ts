/**
 * Security Simulation Engine.
 *
 * Simulates common attack classes against the modeled system and produces a
 * security score 0–100 plus exposure findings. Like the reliability engine the
 * score is the aggregation of weighted findings.
 */

import { Finding, severityFromWeight } from './findings';
import { SystemGraph } from './model';

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
