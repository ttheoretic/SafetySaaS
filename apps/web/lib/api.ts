import type {
  SystemGraph,
  SimulationType,
  BusinessContext,
} from '@failsafe/shared';

import { currentAuth } from './auth-store';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function authHeaders(): Record<string, string> {
  const { token, orgId } = currentAuth();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers['authorization'] = `Bearer ${token}`;
  if (orgId) headers['x-org-id'] = orgId;
  return headers;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface MeResponse {
  user: { id: string; email: string; name?: string };
  activeOrg: { id: string; name: string; plan: string };
  role: string;
  organizations: { id: string; name?: string; role: string }[];
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

  // --- Authenticated (tenant) endpoints ---
  me: () => get<MeResponse>('/me'),
  billing: () => get<{ plan: string; limits: Record<string, unknown>; usage: Record<string, number> }>('/billing'),
  listProjects: () =>
    get<Array<{ id: string; name: string; environment: string }>>('/projects'),
  createProject: (name: string) =>
    post<{ id: string; name: string }>('/projects', { name }),
  startScan: (projectId: string) =>
    post<{ id: string; status: string; reliabilityScore?: number }>(
      `/projects/${projectId}/scans`,
      {},
    ),
  oauthAuthorizeUrl: (provider: string, projectId: string) =>
    get<{ url: string }>(`/oauth/${provider}/authorize?projectId=${projectId}`),
  orgMembers: () =>
    get<Array<{ userId: string; email?: string; name?: string; role: string }>>('/orgs/members'),
  listInvitations: () =>
    get<Array<{ id: string; email: string; role: string }>>('/orgs/invitations'),
  invite: (email: string, role: string) =>
    post<{ id: string; email: string; role: string; token: string }>('/orgs/invitations', { email, role }),
};
