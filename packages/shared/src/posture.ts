/**
 * Risk Posture — the product's central concept.
 *
 * Everything Riscly learns about an application (architecture, code, security,
 * AI usage, reliability, maintainability) collapses into one continuously
 * updated picture: an overall health score, a risk band, and five dimensions
 * that each explain part of it.
 *
 * Two rules keep it honest:
 *  - A dimension nobody has analysed yet reports `analyzed: false` instead of a
 *    flattering 100. An unmeasured system is unknown, not safe.
 *  - Scores are health (higher is better); the band is the risk reading of that
 *    health, so "78 / 100" and "MEDIUM RISK" describe the same state.
 *
 * Pure and deterministic — same inputs, same posture.
 */

import { Confidence, Finding, FindingCategory, SEVERITY_ORDER, Severity } from './findings';
import { QualitySummary, SystemGraph } from './model';

export type RiskDimension =
  | 'security'
  | 'ai_security'
  | 'reliability'
  | 'architecture'
  | 'maintainability';

/** Risk reading of an overall health score. */
export type RiskBand = 'low' | 'medium' | 'high' | 'critical';

export interface DimensionScore {
  dimension: RiskDimension;
  label: string;
  /** 0..100 health — higher is better. Null when the dimension is unmeasured. */
  score: number | null;
  /** Whether Riscly has enough evidence to score this dimension at all. */
  analyzed: boolean;
  /** Why it is unmeasured, shown instead of a score. */
  note?: string;
  findings: number;
  critical: number;
  high: number;
}

export interface RiskPosture {
  /** 0..100 overall application health. Null before the first analysis. */
  score: number | null;
  band: RiskBand;
  dimensions: DimensionScore[];
  counts: Record<Severity, number>;
  /** Total open findings across every dimension. */
  total: number;
  /** One sentence a non-expert can act on. */
  headline: string;
}

export const DIMENSION_LABEL: Record<RiskDimension, string> = {
  security: 'Security',
  ai_security: 'AI Security',
  reliability: 'Reliability',
  architecture: 'Architecture',
  maintainability: 'Maintainability',
};

/** Which dimension each finding category rolls up into. */
export const CATEGORY_DIMENSION: Record<FindingCategory, RiskDimension> = {
  security: 'security',
  ai_security: 'ai_security',
  spof: 'reliability',
  backup: 'reliability',
  redundancy: 'reliability',
  rate_limit: 'reliability',
  database: 'reliability',
  api: 'reliability',
  architecture: 'architecture',
  vendor_lock_in: 'architecture',
  quality: 'maintainability',
};

export function dimensionFor(category: FindingCategory): RiskDimension {
  return CATEGORY_DIMENSION[category] ?? 'security';
}

/** Order the dimensions are presented in, everywhere. */
export const DIMENSION_ORDER: RiskDimension[] = [
  'security',
  'ai_security',
  'reliability',
  'architecture',
  'maintainability',
];

/**
 * How much a finding counts, by confidence — a proven fact weighs more than a
 * pattern match. Mirrors the reliability engine so the numbers agree.
 */
function confidenceFactor(confidence?: Confidence): number {
  switch (confidence) {
    case 'verified':
      return 1;
    case 'high':
      return 0.85;
    case 'heuristic':
      return 0.6;
    default:
      return 1;
  }
}

/**
 * A dimension's penalty saturates: twenty medium findings should not read as
 * worse than one unauthenticated admin endpoint. Criticals still dominate.
 */
function penaltyFor(findings: Finding[]): number {
  const raw = findings.reduce(
    (sum, f) => sum + f.weight * confidenceFactor(f.confidence),
    0,
  );
  // Diminishing returns above ~40 points of raw penalty.
  return raw <= 40 ? raw : 40 + (raw - 40) * 0.45;
}

/** Whether the graph contains anything AI-related worth scoring. */
export function hasAiSurface(graph?: SystemGraph | null): boolean {
  return Boolean(
    graph?.nodes.some((n) => n.kind === 'ai_model' || n.kind === 'ai_agent'),
  );
}

export interface PostureInput {
  /** Open findings only — callers filter out suppressed ones first. */
  findings: Finding[];
  graph?: SystemGraph | null;
  /** Code-health summary from the scan, when code was analysed. */
  quality?: QualitySummary | null;
  /** False before the first successful scan. */
  analyzed?: boolean;
}

export function riskPosture(input: PostureInput): RiskPosture {
  const findings = input.findings ?? [];
  const analyzed = input.analyzed ?? true;

  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) counts[f.severity] += 1;

  const dimensions = DIMENSION_ORDER.map((d) =>
    scoreDimension(d, findings, input, analyzed),
  );

  const scored = dimensions.filter((d) => d.analyzed && d.score !== null);
  const score = scored.length
    ? Math.round(
        scored.reduce((s, d) => s + (d.score as number) * weightOf(d.dimension), 0) /
          scored.reduce((s, d) => s + weightOf(d.dimension), 0),
      )
    : null;

  const band = bandFor(score, counts);

  return {
    score,
    band,
    dimensions,
    counts,
    total: findings.length,
    headline: headlineFor(score, band, counts, dimensions, analyzed),
  };
}

/**
 * Dimension weights in the overall score. Security and reliability decide
 * whether the product works and stays safe; maintainability is a leading
 * indicator, so it counts but does not dominate.
 */
function weightOf(d: RiskDimension): number {
  switch (d) {
    case 'security':
      return 1.3;
    case 'ai_security':
      return 1.1;
    case 'reliability':
      return 1.2;
    case 'architecture':
      return 1;
    case 'maintainability':
      return 0.7;
  }
}

function scoreDimension(
  dimension: RiskDimension,
  all: Finding[],
  input: PostureInput,
  analyzed: boolean,
): DimensionScore {
  const mine = all.filter((f) => dimensionFor(f.category) === dimension);
  const base: Omit<DimensionScore, 'score' | 'analyzed' | 'note'> = {
    dimension,
    label: DIMENSION_LABEL[dimension],
    findings: mine.length,
    critical: mine.filter((f) => f.severity === 'critical').length,
    high: mine.filter((f) => f.severity === 'high').length,
  };

  if (!analyzed) {
    return { ...base, score: null, analyzed: false, note: 'Not scanned yet' };
  }

  // AI security is only meaningful once there is an AI surface to secure.
  if (dimension === 'ai_security' && !hasAiSurface(input.graph) && mine.length === 0) {
    return {
      ...base,
      score: null,
      analyzed: false,
      note: 'No AI components detected',
    };
  }

  // Maintainability comes from the code-health pass, not from topology, so it
  // stays unmeasured until source has actually been read.
  if (dimension === 'maintainability') {
    const q = input.quality;
    if (!q || q.filesAnalyzed === 0) {
      return { ...base, score: null, analyzed: false, note: 'No code analysed yet' };
    }
    // avgScore is a risk value (higher = worse); invert it into health.
    const fromQuality = 100 - Math.min(100, Math.max(0, q.avgScore));
    const score = Math.round(clamp(fromQuality - penaltyFor(mine)));
    return { ...base, score, analyzed: true };
  }

  return { ...base, score: Math.round(clamp(100 - penaltyFor(mine))), analyzed: true };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/**
 * The band is not a pure function of the score: a single open critical means
 * the application is at high risk even when everything else is healthy.
 */
export function bandFor(score: number | null, counts: Record<Severity, number>): RiskBand {
  if (score === null) return 'medium';
  if (counts.critical > 0) return score >= 60 ? 'high' : 'critical';
  if (score >= 85) return 'low';
  if (score >= 70) return 'medium';
  if (score >= 50) return 'high';
  return 'critical';
}

export const BAND_LABEL: Record<RiskBand, string> = {
  low: 'LOW RISK',
  medium: 'MEDIUM RISK',
  high: 'HIGH RISK',
  critical: 'CRITICAL RISK',
};

function headlineFor(
  score: number | null,
  band: RiskBand,
  counts: Record<Severity, number>,
  dimensions: DimensionScore[],
  analyzed: boolean,
): string {
  if (!analyzed || score === null) {
    return 'Connect a repository and run the first scan to build your risk posture.';
  }
  if (counts.critical > 0) {
    const worst = weakest(dimensions);
    return `${counts.critical} critical ${counts.critical === 1 ? 'risk needs' : 'risks need'} attention${worst ? `, mostly in ${worst.label.toLowerCase()}` : ''}.`;
  }
  if (band === 'low') {
    return 'No critical risks. Your posture is healthy — keep an eye on new changes.';
  }
  const worst = weakest(dimensions);
  return worst
    ? `${worst.label} is the weakest dimension at ${worst.score}/100 — start there.`
    : 'No critical risks open.';
}

/** The scored dimension dragging the posture down the most. */
export function weakest(dimensions: DimensionScore[]): DimensionScore | null {
  const scored = dimensions.filter((d) => d.analyzed && d.score !== null);
  if (scored.length === 0) return null;
  return scored.reduce((a, b) => ((a.score as number) <= (b.score as number) ? a : b));
}

/** Findings for one dimension, worst first — powers the drill-down. */
export function findingsForDimension(
  findings: Finding[],
  dimension: RiskDimension,
): Finding[] {
  return findings
    .filter((f) => dimensionFor(f.category) === dimension)
    .sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);
}
