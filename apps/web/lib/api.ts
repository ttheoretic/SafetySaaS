import type {
  SystemGraph,
  SimulationType,
  SimulationParams,
  BusinessContext,
  PlanLimits,
  Plan,
  GraphOverlay,
} from '@riscly/shared';

import { currentAuth, handleUnauthorized } from './auth-store';

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
  // An expired/invalid token: clear the session so the app re-authenticates
  // (→ /login) instead of misreading it as "unsubscribed" (→ paywall).
  if (res.status === 401) handleUnauthorized();
  let detail = `${res.status}`;
  try {
    const body = await res.json();
    if (body?.message) detail = Array.isArray(body.message) ? body.message.join(', ') : body.message;
  } catch { /* ignore */ }
  const err = new Error(`${path}: ${detail}`) as Error & { status?: number };
  err.status = res.status;
  throw err;
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

async function del<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'DELETE', headers: authHeaders() });
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
  /** Platform staff — may access the internal /admin console. */
  platformAdmin?: boolean;
  organizations: { id: string; name?: string; role: string }[];
  subscription: { active: boolean; status: string; plan: string };
}

export interface BillingResponse {
  plan: Plan;
  provider: string;
  limits: PlanLimits;
  usage: { projects: number; members: number; scansToday: number };
}

export interface BillingInvoice {
  id: string;
  number?: string;
  date: string;
  amount: string;
  status: string;
  url?: string;
}

export interface PaymentMethodInfo {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface BillingDetailsResponse {
  invoices: BillingInvoice[];
  paymentMethod: PaymentMethodInfo | null;
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
    opts: {
      params?: SimulationParams
      business?: BusinessContext
      durationHours?: number
    } = {},
  ) =>
    post('/analyze/simulate', {
      graph,
      type,
      params: opts.params,
      business: opts.business,
      durationHours: opts.durationHours ?? 1,
    }),
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
  billingDetails: () => get<BillingDetailsResponse>('/billing/details'),
  checkout: (plan: string) => post<{ url: string }>('/billing/checkout', { plan }),
  /** Stripe customer-portal URL to manage the subscription (change/cancel/card). */
  billingPortal: () => post<{ url: string }>('/billing/portal', {}),
  /** Confirm a Stripe Checkout Session on return so access is granted at once. */
  confirmCheckout: (sessionId: string) =>
    post<{ active: boolean }>('/billing/confirm', { sessionId }),
  listProjects: () =>
    get<Array<{ id: string; name: string; environment: string }>>('/projects'),
  createProject: (name: string) =>
    post<{ id: string; name: string }>('/projects', { name }),
  /** Rename a project (e.g. to the repo it was attached to). */
  renameProject: (projectId: string, name: string) =>
    patch<{ id: string; name: string }>(`/projects/${projectId}`, { name }),
  /** Open a remediation-plan PR (from the latest scan) on the connected repo. */
  remediationPr: (projectId: string) =>
    post<{ url: string; branch: string; repo: string }>(
      `/projects/${projectId}/remediation-pr`,
      {},
    ),
  /** Turn extra selected repos into their own projects (onboarding multi-repo). */
  fanOut: (projectId: string, repos: string[]) =>
    post<{ created: Array<{ id: string; repo: string }> }>(
      `/projects/${projectId}/scans/fan-out`,
      { repos },
    ),
  startScan: (projectId: string) =>
    post<{ id: string; status: string; reliabilityScore?: number }>(
      `/projects/${projectId}/scans`,
      {},
    ),
  /** Recent commits across the project's connected GitHub repos. */
  listCommits: (projectId: string, limit = 8) =>
    get<
      Array<{
        sha: string
        message: string
        author: string
        repo: string
        date: string
        url: string
      }>
    >(`/projects/${projectId}/commits?limit=${limit}`),
  /** Repo file tree (blob paths) for the code explorer. */
  listFiles: (projectId: string, repo?: string) =>
    get<{
      repo: string | null
      repos: string[]
      files: Array<{ path: string; size?: number }>
    }>(`/projects/${projectId}/files${repo ? `?repo=${encodeURIComponent(repo)}` : ''}`),
  /** Raw content of a single repo file. */
  fileContent: (projectId: string, repo: string, path: string) =>
    get<{ repo: string; path: string; content: string | null }>(
      `/projects/${projectId}/files/content?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`,
    ),
  /** Generate an AI fix for a located code issue (preview). */
  codeFix: (
    projectId: string,
    body: {
      repo?: string
      file: string
      line?: number
      rule: string
      title: string
      description?: string
    },
  ) =>
    post<{
      original: string
      aiEnabled: boolean
      fixed: string | null
      explanation: string | null
    }>(`/projects/${projectId}/code/fix`, body),
  /** Apply an AI fix by committing it directly to the default branch (no PR). */
  codeFixCommit: (
    projectId: string,
    body: {
      repo?: string
      file: string
      line?: number
      rule: string
      title: string
      description?: string
    },
  ) =>
    post<{ url: string; repo: string; branch: string }>(
      `/projects/${projectId}/code/fix/commit`,
      body,
    ),
  /** Deep AI code analysis over the repo's source files (merged into the scan). */
  deepScan: (projectId: string) =>
    post<{
      added: number
      total: number
      filesAnalyzed: number
      aiEnabled: boolean
    }>(`/projects/${projectId}/code/deep-scan`, {}),
  /** Apply an AI fix by opening a pull request with the corrected file. */
  codeFixPr: (
    projectId: string,
    body: {
      repo: string
      file: string
      line?: number
      rule: string
      title: string
      description?: string
    },
  ) =>
    post<{ url: string; branch: string; repo: string }>(
      `/projects/${projectId}/code/fix/pr`,
      body,
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
  oauthAuthorizeUrl: (provider: string, projectId: string, next?: string) =>
    get<{ url: string }>(
      `/oauth/${provider}/authorize?projectId=${projectId}` +
        (next ? `&next=${encodeURIComponent(next)}` : ''),
    ),
  getBusiness: (projectId: string) =>
    get<BusinessInput | null>(`/projects/${projectId}/business`),
  /** The customer's manual corrections to the auto-detected architecture. */
  getArchitectureOverlay: (projectId: string) =>
    get<GraphOverlay | null>(`/projects/${projectId}/architecture-overlay`),
  updateArchitectureOverlay: (projectId: string, overlay: GraphOverlay) =>
    put<GraphOverlay>(`/projects/${projectId}/architecture-overlay`, overlay),
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
  /** Merge non-secret config (e.g. which repos to scan) into a connection. */
  updateConnection: (projectId: string, connectionId: string, metadata: Record<string, unknown>) =>
    patch<{ id: string; provider: string; status: string; metadata: Record<string, unknown> }>(
      `/projects/${projectId}/connections/${connectionId}`,
      { metadata },
    ),
  /** Disconnect a connected service. */
  deleteConnection: (projectId: string, connectionId: string) =>
    del<{ ok: boolean }>(`/projects/${projectId}/connections/${connectionId}`),
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
  /** Organization audit trail with actor (admins+ only; 403 otherwise). */
  auditLogs: () =>
    get<
      Array<{
        id: string
        action: string
        targetType?: string
        targetId?: string
        metadata?: Record<string, unknown>
        createdAt: string
        actor: { id: string; name?: string; email?: string } | null
      }>
    >('/orgs/audit-logs'),
  /** Auto-connect GitHub from a sign-in provider token (skips the OAuth step). */
  connectGithubFromToken: (accessToken: string) =>
    post<{ projectId: string; repos: string[] }>('/oauth/github/from-token', { accessToken }),
  /** Send a support request (delivered to the team inbox, reply-to the user). */
  support: (subject: string, message: string) =>
    post<{ ok: boolean }>('/support', { subject, message }),
  orgMembers: () =>
    get<Array<{ userId: string; email?: string; name?: string; role: string }>>('/orgs/members'),
  listInvitations: () =>
    get<Array<{ id: string; email: string; role: string }>>('/orgs/invitations'),
  invite: (email: string, role: string) =>
    post<{ id: string; email: string; role: string; token: string }>('/orgs/invitations', { email, role }),
  downloadReport: (projectId: string, type: string, format: string) =>
    getBlob(`/projects/${projectId}/reports/${type}?format=${format}`),

  /** Submit product feedback (any authenticated user). */
  submitFeedback: (body: { title: string; body: string; category: string }) =>
    post<{ id: string; status: string }>('/feedback', body),

  // --- Internal admin console (platform staff only) ---
  admin: {
    overview: () => get<AdminOverview>('/admin/overview'),
    activity: () => get<AdminActivity[]>('/admin/activity'),
    customers: () => get<AdminCustomer[]>('/admin/customers'),
    customer: (orgId: string) => get<AdminCustomerDetail>(`/admin/customers/${orgId}`),
    suspend: (orgId: string) => post(`/admin/customers/${orgId}/suspend`, {}),
    reactivate: (orgId: string) => post(`/admin/customers/${orgId}/reactivate`, {}),
    resetSubscription: (orgId: string) => post(`/admin/customers/${orgId}/reset-subscription`, {}),
    exportWorkspace: (orgId: string) => get<Record<string, unknown>>(`/admin/customers/${orgId}/export`),
    billing: () => get<AdminBilling>('/admin/billing'),
    aiUsage: () => get<AdminAiUsage>('/admin/ai-usage'),
    feedback: () => get<AdminFeedback[]>('/admin/feedback'),
    updateFeedback: (id: string, body: Record<string, unknown>) =>
      patch(`/admin/feedback/${id}`, body),
    infrastructure: () => get<AdminInfra>('/admin/infrastructure'),
    settings: () => get<AdminSettings>('/admin/settings'),
    updateSetting: (key: string, value: Record<string, unknown>) =>
      patch(`/admin/settings/${key}`, { value }),
    logs: () => get<AdminLog[]>('/admin/logs'),
  },
};

export type Series = { date: string; value: number }[]

export interface AdminOverview {
  kpis: {
    mrr: number; arr: number; activeCustomers: number; trialUsers: number;
    activeWorkspaces: number; totalGithubAccounts: number; connectedCloudProviders: number;
    avgReliabilityScore: number; avgRisksPerWorkspace: number; avgRevenueAtRisk: number;
    totalCustomers: number; totalUsers: number;
  };
  charts: {
    signups: Series; scans: Series; newWorkspaces: Series;
    planDistribution: { plan: string; count: number }[];
  };
}

export interface AdminActivity { type: string; label: string; workspace?: string; at: string }

export interface AdminCustomer {
  orgId: string; company: string; workspace: string; plan: string; owner: string;
  users: number; projects: number; joined: string; lastActive: string | null;
  riskScore: number | null; status: string; githubConnected: boolean;
}

export interface AdminCustomerDetail {
  org: { id: string; name: string; slug: string; plan: string; createdAt: string };
  subscription: Record<string, unknown> | null;
  members: { userId: string; email?: string; name?: string; role: string; lastSeenAt?: string }[];
  projects: Array<{
    id: string; name: string; reliabilityScore: number | null;
    integrations: { provider: string; status: string; createdAt: string }[];
    scans: { id: string; status: string; score?: number; createdAt: string }[];
    scenarios: { id: string; name: string; createdAt: string }[];
    businessContext: Record<string, unknown> | null;
  }>;
  aiUsage: { requests: number; tokens: number; cost: number };
  recentActivity: Array<{ id: string; action: string; createdAt: string }>;
}

export interface AdminBilling {
  stripeConnected?: boolean;
  summary: {
    mrr: number; arr: number; activeSubscriptions: number; trials: number;
    pastDue: number; canceled: number; newThisMonth: number;
    refunds?: number | null; refundsAmount?: number | null; failedPayments?: number | null;
  };
  invoices?: Array<{ id: string; customer: string | null; amount: number; status: string; created: string; url: string | null }>;
  customers: Array<{
    orgId: string; customer: string; plan: string; status: string;
    renewalDate: string | null; mrr: number; ltv: number; stripeCustomerId: string | null;
  }>;
}

export interface AdminAiUsage {
  cards: {
    totalRequests: number; totalTokens: number; inputTokens: number; outputTokens: number;
    monthlyCost: number; avgCostPerUser: number;
  };
  charts: { dailyCost: Series; byModel: { model: string; requests: number; cost: number }[] };
  customers: Array<{ orgId: string; company: string; requests: number; tokens: number; cost: number; model: string; last: string }>;
}

export interface AdminFeedback {
  id: string; orgId?: string; workspace?: string | null; title: string; body: string;
  category: string; priority: string; status: string; votes: number;
  assignee?: string; adminReply?: string; createdAt: string; updatedAt: string;
}

export interface AdminInfra {
  services: { name: string; status: string; latencyMs: number | null; note: string | null }[];
  env: { nodeVersion: string; uptimeSec: number; memoryMb: number };
}

export interface AdminSettings {
  featureFlags: Record<string, unknown>;
  maintenance: { enabled: boolean; message: string };
  announcement: { enabled: boolean; message: string };
  system: { version: string; commit: string | null; node: string };
  integrations: Record<string, boolean>;
}

export interface AdminLog {
  id: string; actorUserId: string; action: string; targetType?: string; targetId?: string;
  metadata: Record<string, unknown>; createdAt: string; actor: { email?: string; name?: string } | null;
}
