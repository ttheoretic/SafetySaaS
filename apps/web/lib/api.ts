import type {
  SystemGraph,
  SimulationType,
  BusinessContext,
  PlanLimits,
  Plan,
} from '@riscly/shared';

import { currentAuth } from './auth-store';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function authHeaders(): Record<string, string> {
  const { token, orgId } = currentAuth();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers['authorization'] = `Bearer ${token}`;
  if (orgId) headers['x-org-id'] = orgId;
  return headers;
}

/** Fetch wrapper that turns network/CORS failures into a clear message. */
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${BASE}/api${path}`, { ...init, cache: 'no-store' });
  } catch {
    throw new Error(`Cannot reach the API at ${BASE}. Is the backend running?`);
  }
}

async function readError(res: Response, path: string): Promise<never> {
  let detail = `${res.status}`;
  try {
    const body = await res.json();
    if (body?.message) detail = Array.isArray(body.message) ? body.message.join(', ') : body.message;
  } catch { /* ignore */ }
  throw new Error(`${path}: ${detail}`);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) await readError(res, path);
  return res.json() as Promise<T>;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) await readError(res, path);
  return res.json() as Promise<T>;
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) await readError(res, path);
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { headers: authHeaders() });
  if (!res.ok) await readError(res, path);
  return res.json() as Promise<T>;
}

async function getBlob(path: string): Promise<Blob> {
  const res = await apiFetch(path, { headers: authHeaders() });
  if (!res.ok) await readError(res, path);
  return res.blob();
}

export interface MeResponse {
  user: { id: string; email: string; name?: string };
  activeOrg: { id: string; name: string; plan: string };
  role: string;
  organizations: { id: string; name?: string; role: string }[];
  subscription: { active: boolean; status: string; plan: string };
}

export interface BillingResponse {
  plan: Plan;
  provider: string;
  limits: PlanLimits;
  usage: { projects: number; members: number; scansToday: number };
}

export interface PredictionResponse {
  aiEnabled: boolean;
  provider: string;
  tier: 'basic' | 'sonnet' | 'opus';
  predictions: Array<{
    id: string;
    category: string;
    severity: string;
    title: string;
    horizon: string;
    likelihood: number;
    rationale: string;
    recommendation: string;
    source: string;
  }>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BusinessInput {
  monthlyRevenue: number;
  activeUsers: number;
  currency?: string;
  peakCheckoutShare?: number;
  slaCreditRatePerHour?: number;
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
  /** Update the current user's display name. */
  updateProfile: (name: string) =>
    patch<{ id: string; email: string; name?: string }>('/me', { name }),
  billing: () => get<BillingResponse>('/billing'),
  checkout: (plan: string) => post<{ url: string }>('/billing/checkout', { plan }),
  /** Confirm a Stripe Checkout Session on return so access is granted at once. */
  confirmCheckout: (sessionId: string) =>
    post<{ active: boolean }>('/billing/confirm', { sessionId }),
  listProjects: () =>
    get<Array<{ id: string; name: string; environment: string }>>('/projects'),
  createProject: (name: string) =>
    post<{ id: string; name: string }>('/projects', { name }),
  startScan: (projectId: string) =>
    post<{ id: string; status: string; reliabilityScore?: number }>(
      `/projects/${projectId}/scans`,
      {},
    ),
  listScans: (projectId: string) =>
    get<Array<{ id: string; status: string; graph?: unknown; reliabilityScore?: number; createdAt: string }>>(
      `/projects/${projectId}/scans`,
    ),
  /** AI failure prediction for the project's latest scan (model chosen by plan). */
  tenantPredict: (projectId: string) =>
    post<PredictionResponse>(`/projects/${projectId}/scans/predict`, {}),
  /** Grounded AI chat about the project's latest scan. */
  tenantChat: (projectId: string, messages: ChatMessage[]) =>
    post<{ aiEnabled: boolean; provider: string; reply: string }>(
      `/projects/${projectId}/scans/chat`,
      { messages },
    ),
  oauthAuthorizeUrl: (provider: string, projectId: string) =>
    get<{ url: string }>(`/oauth/${provider}/authorize?projectId=${projectId}`),
  getBusiness: (projectId: string) =>
    get<BusinessInput | null>(`/projects/${projectId}/business`),
  updateBusiness: (projectId: string, body: BusinessInput) =>
    put<BusinessInput>(`/projects/${projectId}/business`, body),
  /** Live MRR / active-users suggestion from a connected Stripe account. */
  getStripeSuggestion: (projectId: string) =>
    get<{ monthlyRevenue: number; currency: string; activeUsers: number } | null>(
      `/projects/${projectId}/business/stripe-suggestion`,
    ),
  listConnections: (projectId: string) =>
    get<Array<{ id: string; provider: string; status: string; metadata?: Record<string, unknown>; createdAt: string }>>(
      `/projects/${projectId}/connections`,
    ),
  /** Token-based connection (providers without an OAuth flow). */
  createConnection: (
    projectId: string,
    body: { provider: string; token?: string; metadata?: Record<string, unknown> },
  ) => post<{ id: string; provider: string; status: string }>(`/projects/${projectId}/connections`, body),
  listScenarios: (projectId: string) =>
    get<Array<{ id: string; name: string; prompt: string; createdAt: string; lastResult?: unknown }>>(
      `/projects/${projectId}/scenarios`,
    ),
  createScenario: (
    projectId: string,
    body: { name: string; prompt?: string; steps: unknown[]; business?: unknown },
  ) => post<{ id: string; name: string }>(`/projects/${projectId}/scenarios`, body),
  runScenario: (projectId: string, scenarioId: string) =>
    post<{ worstImpact: string; totalRevenueImpact: number; currency: string; steps: unknown[] }>(
      `/projects/${projectId}/scenarios/${scenarioId}/run`,
      {},
    ),
  orgMembers: () =>
    get<Array<{ userId: string; email?: string; name?: string; role: string }>>('/orgs/members'),
  listInvitations: () =>
    get<Array<{ id: string; email: string; role: string }>>('/orgs/invitations'),
  invite: (email: string, role: string) =>
    post<{ id: string; email: string; role: string; token: string }>('/orgs/invitations', { email, role }),
  downloadReport: (projectId: string, type: string, format: string) =>
    getBlob(`/projects/${projectId}/reports/${type}?format=${format}`),
};
