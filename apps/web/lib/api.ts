import type {
  SystemGraph,
  SimulationType,
  BusinessContext,
} from '@failsafe/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface ReliabilityResponse {
  score: number;
  findings: Array<{
    category: string;
    severity: string;
    title: string;
    description: string;
    nodeId?: string;
    weight: number;
  }>;
  recommendations: Array<{
    title: string;
    priority: string;
    probability: number;
    businessImpact: string;
    fix: string;
    riskReductionPct: number;
  }>;
  summary: Record<string, number>;
}

export const api = {
  reliability: (graph: SystemGraph) =>
    post<ReliabilityResponse>('/analyze/reliability', { graph }),
  security: (graph: SystemGraph) =>
    post<ReliabilityResponse & { exposures: unknown[] }>(
      '/analyze/security',
      { graph },
    ),
  simulate: (
    graph: SystemGraph,
    type: SimulationType,
    business?: BusinessContext,
    durationHours = 1,
  ) => post('/analyze/simulate', { graph, type, business, durationHours }),
  report: (graph: SystemGraph, business?: BusinessContext) =>
    post('/analyze/report', { graph, business }),
  predict: (graph: SystemGraph, currentUsers?: number) =>
    post<{ aiEnabled: boolean; provider: string; predictions: unknown[] }>(
      '/analyze/predict',
      { graph, currentUsers },
    ),
};
