import { Global, Injectable, Module, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

/**
 * Persistence layer.
 *
 * `Store` is an async abstract interface with two implementations:
 *   - InMemoryStore — default; used in dev/tests, no database required.
 *   - PrismaStore   — PostgreSQL via Prisma; used when DATABASE_URL is set.
 *
 * All methods are async so the same controllers work against either backend.
 */

export interface ProjectRecord {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  environment: string;
  createdAt: string;
  /** Customer business context (MRR, active users, currency) for revenue impact. */
  businessContext?: Record<string, unknown> | null;
  /** Customer's manual corrections to the auto-detected architecture (overlay). */
  architectureOverlay?: Record<string, unknown> | null;
}

export interface ScanRecord {
  id: string;
  orgId: string;
  projectId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  graph?: unknown;
  reliabilityScore?: number;
  findings?: unknown[];
  recommendations?: unknown[];
  createdAt: string;
  finishedAt?: string;
}

export interface ConnectionRecord {
  id: string;
  orgId: string;
  projectId: string;
  provider: string;
  status: 'active' | 'error' | 'revoked';
  /** Non-secret provider config: repos to scan, regions, etc. */
  metadata: Record<string, unknown>;
  /** Envelope-encrypted access token (AES-256-GCM); never returned to clients. */
  encryptedToken?: string;
  createdAt: string;
}

export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export interface UserRecord {
  id: string;
  supabaseId: string;
  email: string;
  name?: string;
  /** Platform staff — grants access to the internal /admin console. */
  platformAdmin?: boolean;
  lastSeenAt?: string;
  createdAt: string;
}

export interface FeedbackRecord {
  id: string;
  orgId?: string;
  userId?: string;
  title: string;
  body: string;
  category: 'bug' | 'feature' | 'improvement' | 'question';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'planned' | 'in_progress' | 'completed' | 'archived';
  votes: number;
  assignee?: string;
  adminReply?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiUsageRecord {
  id: string;
  orgId: string;
  userId?: string;
  /** 'chat' | 'predict' | 'fix' | 'deep-scan' */
  feature: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  latencyMs: number;
  createdAt: string;
}

export interface AdminLogRecord {
  id: string;
  actorUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PlatformSettingRecord {
  key: string;
  value: Record<string, unknown>;
  updatedAt: string;
}

export type TriageStatusValue = 'open' | 'false_positive' | 'accepted_risk' | 'resolved';

export interface SuppressionRecord {
  id: string;
  orgId: string;
  projectId: string;
  fingerprint: string;
  status: TriageStatusValue;
  note?: string;
  actorUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'growth' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface SubscriptionRecord {
  orgId: string;
  plan: OrganizationRecord['plan'];
  status: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
}

export interface MembershipRecord {
  id: string;
  orgId: string;
  userId: string;
  role: Role;
  createdAt: string;
}

export interface ScenarioRecord {
  id: string;
  orgId: string;
  projectId: string;
  name: string;
  prompt: string;
  definition: Record<string, unknown>;
  lastResult?: unknown;
  createdAt: string;
}

export interface InvitationRecord {
  id: string;
  orgId: string;
  email: string;
  role: Role;
  token: string;
  invitedById: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  orgId: string;
  actorUserId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** The repository contract every backend implements. */
export abstract class Store {
  /** Cheap connectivity check for readiness probes. Resolves true when the
   *  backing store is reachable. */
  abstract ping(): Promise<boolean>;

  abstract createProject(input: Omit<ProjectRecord, 'id' | 'createdAt'>): Promise<ProjectRecord>;
  abstract listProjects(orgId: string): Promise<ProjectRecord[]>;
  /** Every project across all orgs — for the continuous-monitoring sweep. */
  abstract listAllProjects(): Promise<ProjectRecord[]>;
  abstract getProject(id: string): Promise<ProjectRecord | undefined>;
  abstract updateProject(id: string, patch: Partial<ProjectRecord>): Promise<ProjectRecord | undefined>;

  abstract createScan(input: Omit<ScanRecord, 'id' | 'createdAt'>): Promise<ScanRecord>;
  abstract updateScan(id: string, patch: Partial<ScanRecord>): Promise<ScanRecord | undefined>;
  abstract getScan(id: string): Promise<ScanRecord | undefined>;
  abstract listScans(projectId: string): Promise<ScanRecord[]>;
  /** Number of scans created for an org at or after the given ISO timestamp. */
  abstract countScansSince(orgId: string, sinceIso: string): Promise<number>;

  abstract createConnection(input: Omit<ConnectionRecord, 'id' | 'createdAt'>): Promise<ConnectionRecord>;
  abstract listConnections(projectId: string): Promise<ConnectionRecord[]>;
  abstract getConnection(id: string): Promise<ConnectionRecord | undefined>;
  abstract updateConnectionMetadata(id: string, metadata: Record<string, unknown>): Promise<ConnectionRecord>;
  abstract deleteConnection(id: string): Promise<void>;

  abstract createUser(input: Omit<UserRecord, 'id' | 'createdAt'>): Promise<UserRecord>;
  abstract getUserBySupabaseId(supabaseId: string): Promise<UserRecord | undefined>;
  abstract getUserByEmail(email: string): Promise<UserRecord | undefined>;
  abstract getUser(id: string): Promise<UserRecord | undefined>;
  abstract updateUser(
    id: string,
    patch: Partial<Pick<UserRecord, 'supabaseId' | 'email' | 'name' | 'platformAdmin' | 'lastSeenAt'>>,
  ): Promise<UserRecord | undefined>;
  /** Every user (admin console). */
  abstract listAllUsers(): Promise<UserRecord[]>;

  abstract createOrganization(input: Omit<OrganizationRecord, 'id' | 'createdAt'>): Promise<OrganizationRecord>;
  abstract getOrganization(id: string): Promise<OrganizationRecord | undefined>;
  abstract updateOrganization(id: string, patch: Partial<OrganizationRecord>): Promise<OrganizationRecord | undefined>;

  abstract upsertSubscription(sub: SubscriptionRecord): Promise<SubscriptionRecord>;
  abstract getSubscription(orgId: string): Promise<SubscriptionRecord | undefined>;

  abstract addMembership(input: Omit<MembershipRecord, 'id' | 'createdAt'>): Promise<MembershipRecord>;
  abstract getMembership(orgId: string, userId: string): Promise<MembershipRecord | undefined>;
  abstract listMembershipsForUser(userId: string): Promise<MembershipRecord[]>;
  abstract listMembershipsForOrg(orgId: string): Promise<MembershipRecord[]>;

  abstract addAuditLog(input: Omit<AuditLogRecord, 'id' | 'createdAt'>): Promise<AuditLogRecord>;
  abstract listAuditLogs(orgId: string): Promise<AuditLogRecord[]>;

  abstract createScenario(input: Omit<ScenarioRecord, 'id' | 'createdAt'>): Promise<ScenarioRecord>;
  abstract getScenario(id: string): Promise<ScenarioRecord | undefined>;
  abstract updateScenario(id: string, patch: Partial<ScenarioRecord>): Promise<ScenarioRecord | undefined>;
  abstract listScenarios(projectId: string): Promise<ScenarioRecord[]>;

  abstract createInvitation(input: Omit<InvitationRecord, 'id' | 'createdAt'>): Promise<InvitationRecord>;
  abstract getInvitationByToken(token: string): Promise<InvitationRecord | undefined>;
  abstract listInvitations(orgId: string): Promise<InvitationRecord[]>;
  abstract markInvitationAccepted(id: string): Promise<InvitationRecord | undefined>;

  // --- Admin console -------------------------------------------------------
  /** Every organization (admin console). */
  abstract listOrganizations(): Promise<OrganizationRecord[]>;
  /** Every subscription (admin billing). */
  abstract listAllSubscriptions(): Promise<SubscriptionRecord[]>;
  /** Every scan across all orgs (admin metrics). */
  abstract listAllScans(): Promise<ScanRecord[]>;
  /** Every connection across all orgs (admin metrics). */
  abstract listAllConnections(): Promise<ConnectionRecord[]>;

  abstract createFeedback(input: Omit<FeedbackRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeedbackRecord>;
  abstract listFeedback(): Promise<FeedbackRecord[]>;
  abstract getFeedback(id: string): Promise<FeedbackRecord | undefined>;
  abstract updateFeedback(id: string, patch: Partial<FeedbackRecord>): Promise<FeedbackRecord | undefined>;

  abstract addAiUsage(input: Omit<AiUsageRecord, 'id' | 'createdAt'>): Promise<AiUsageRecord>;
  /** AI usage rows created at/after the given ISO timestamp (admin analytics). */
  abstract listAiUsageSince(sinceIso: string): Promise<AiUsageRecord[]>;

  abstract addAdminLog(input: Omit<AdminLogRecord, 'id' | 'createdAt'>): Promise<AdminLogRecord>;
  abstract listAdminLogs(): Promise<AdminLogRecord[]>;

  abstract getSetting(key: string): Promise<PlatformSettingRecord | undefined>;
  abstract setSetting(key: string, value: Record<string, unknown>): Promise<PlatformSettingRecord>;
  abstract listSettings(): Promise<PlatformSettingRecord[]>;

  // --- Finding triage / suppression ----------------------------------------
  abstract listSuppressions(projectId: string): Promise<SuppressionRecord[]>;
  /** Upsert a finding's triage status (by projectId + fingerprint). */
  abstract setSuppression(
    input: Omit<SuppressionRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SuppressionRecord>;
}

@Injectable()
export class InMemoryStore extends Store {
  private projects = new Map<string, ProjectRecord>();
  private scans = new Map<string, ScanRecord>();
  private connections = new Map<string, ConnectionRecord>();
  private users = new Map<string, UserRecord>();
  private organizations = new Map<string, OrganizationRecord>();
  private memberships = new Map<string, MembershipRecord>();
  private auditLogs = new Map<string, AuditLogRecord>();
  private scenarios = new Map<string, ScenarioRecord>();
  private subscriptions = new Map<string, SubscriptionRecord>();
  private invitations = new Map<string, InvitationRecord>();
  private feedback = new Map<string, FeedbackRecord>();
  private aiUsage = new Map<string, AiUsageRecord>();
  private adminLogs = new Map<string, AdminLogRecord>();
  private settings = new Map<string, PlatformSettingRecord>();
  private suppressions = new Map<string, SuppressionRecord>();

  private stamp<T>(input: T): T & { id: string; createdAt: string } {
    return { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
  }

  async ping() {
    return true;
  }

  async listAllProjects() {
    return [...this.projects.values()];
  }

  async createProject(input: Omit<ProjectRecord, 'id' | 'createdAt'>) {
    const record = this.stamp(input);
    this.projects.set(record.id, record);
    return record;
  }
  async listProjects(orgId: string) {
    return [...this.projects.values()].filter((p) => p.orgId === orgId);
  }
  async getProject(id: string) {
    return this.projects.get(id);
  }
  async updateProject(id: string, patch: Partial<ProjectRecord>) {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.projects.set(id, updated);
    return updated;
  }

  async createScan(input: Omit<ScanRecord, 'id' | 'createdAt'>) {
    const record = this.stamp(input);
    this.scans.set(record.id, record);
    return record;
  }
  async updateScan(id: string, patch: Partial<ScanRecord>) {
    const existing = this.scans.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.scans.set(id, updated);
    return updated;
  }
  async getScan(id: string) {
    return this.scans.get(id);
  }
  async listScans(projectId: string) {
    return [...this.scans.values()]
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async countScansSince(orgId: string, sinceIso: string) {
    return [...this.scans.values()].filter(
      (s) => s.orgId === orgId && s.createdAt >= sinceIso,
    ).length;
  }

  async createConnection(input: Omit<ConnectionRecord, 'id' | 'createdAt'>) {
    const record = this.stamp(input);
    this.connections.set(record.id, record);
    return record;
  }
  async listConnections(projectId: string) {
    return [...this.connections.values()].filter((c) => c.projectId === projectId);
  }
  async getConnection(id: string) {
    return this.connections.get(id);
  }
  async updateConnectionMetadata(id: string, metadata: Record<string, unknown>) {
    const existing = this.connections.get(id);
    if (!existing) throw new Error('Connection not found');
    const updated = { ...existing, metadata };
    this.connections.set(id, updated);
    return updated;
  }
  async deleteConnection(id: string) {
    this.connections.delete(id);
  }

  async createUser(input: Omit<UserRecord, 'id' | 'createdAt'>) {
    // Mirror Postgres' unique constraints on supabaseId/email so tests exercise
    // the same conflict (P2002) handling the real store triggers.
    const clash = [...this.users.values()].some(
      (u) => u.supabaseId === input.supabaseId || u.email === input.email,
    );
    if (clash) {
      throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    }
    const record = this.stamp(input);
    this.users.set(record.id, record);
    return record;
  }
  async getUserBySupabaseId(supabaseId: string) {
    return [...this.users.values()].find((u) => u.supabaseId === supabaseId);
  }
  async getUserByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email);
  }
  async getUser(id: string) {
    return this.users.get(id);
  }
  async updateUser(
    id: string,
    patch: Partial<Pick<UserRecord, 'supabaseId' | 'email' | 'name' | 'platformAdmin' | 'lastSeenAt'>>,
  ) {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.users.set(id, updated);
    return updated;
  }
  async listAllUsers() {
    return [...this.users.values()];
  }

  async createOrganization(input: Omit<OrganizationRecord, 'id' | 'createdAt'>) {
    const record = this.stamp(input);
    this.organizations.set(record.id, record);
    return record;
  }
  async getOrganization(id: string) {
    return this.organizations.get(id);
  }
  async updateOrganization(id: string, patch: Partial<OrganizationRecord>) {
    const existing = this.organizations.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.organizations.set(id, updated);
    return updated;
  }

  async upsertSubscription(sub: SubscriptionRecord) {
    this.subscriptions.set(sub.orgId, sub);
    return sub;
  }
  async getSubscription(orgId: string) {
    return this.subscriptions.get(orgId);
  }

  async addMembership(input: Omit<MembershipRecord, 'id' | 'createdAt'>) {
    const record = this.stamp(input);
    this.memberships.set(record.id, record);
    return record;
  }
  async getMembership(orgId: string, userId: string) {
    return [...this.memberships.values()].find(
      (m) => m.orgId === orgId && m.userId === userId,
    );
  }
  async listMembershipsForUser(userId: string) {
    return [...this.memberships.values()].filter((m) => m.userId === userId);
  }
  async listMembershipsForOrg(orgId: string) {
    return [...this.memberships.values()].filter((m) => m.orgId === orgId);
  }

  async addAuditLog(input: Omit<AuditLogRecord, 'id' | 'createdAt'>) {
    const record = this.stamp(input);
    this.auditLogs.set(record.id, record);
    return record;
  }
  async listAuditLogs(orgId: string) {
    return [...this.auditLogs.values()]
      .filter((a) => a.orgId === orgId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createScenario(input: Omit<ScenarioRecord, 'id' | 'createdAt'>) {
    const record = this.stamp(input);
    this.scenarios.set(record.id, record);
    return record;
  }
  async getScenario(id: string) {
    return this.scenarios.get(id);
  }
  async updateScenario(id: string, patch: Partial<ScenarioRecord>) {
    const existing = this.scenarios.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.scenarios.set(id, updated);
    return updated;
  }
  async listScenarios(projectId: string) {
    return [...this.scenarios.values()]
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createInvitation(input: Omit<InvitationRecord, 'id' | 'createdAt'>) {
    const record = this.stamp(input);
    this.invitations.set(record.id, record);
    return record;
  }
  async getInvitationByToken(token: string) {
    return [...this.invitations.values()].find((i) => i.token === token);
  }
  async listInvitations(orgId: string) {
    return [...this.invitations.values()]
      .filter((i) => i.orgId === orgId && !i.acceptedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async markInvitationAccepted(id: string) {
    const existing = this.invitations.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, acceptedAt: new Date().toISOString() };
    this.invitations.set(id, updated);
    return updated;
  }

  // --- Admin console ---------------------------------------------------------
  async listOrganizations() {
    return [...this.organizations.values()];
  }
  async listAllSubscriptions() {
    return [...this.subscriptions.values()];
  }
  async listAllScans() {
    return [...this.scans.values()];
  }
  async listAllConnections() {
    return [...this.connections.values()];
  }

  async createFeedback(input: Omit<FeedbackRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    const record: FeedbackRecord = { id: randomUUID(), createdAt: now, updatedAt: now, ...input };
    this.feedback.set(record.id, record);
    return record;
  }
  async listFeedback() {
    return [...this.feedback.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getFeedback(id: string) {
    return this.feedback.get(id);
  }
  async updateFeedback(id: string, patch: Partial<FeedbackRecord>) {
    const existing = this.feedback.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.feedback.set(id, updated);
    return updated;
  }

  async addAiUsage(input: Omit<AiUsageRecord, 'id' | 'createdAt'>) {
    const record = this.stamp(input);
    this.aiUsage.set(record.id, record);
    return record;
  }
  async listAiUsageSince(sinceIso: string) {
    return [...this.aiUsage.values()].filter((u) => u.createdAt >= sinceIso);
  }

  async addAdminLog(input: Omit<AdminLogRecord, 'id' | 'createdAt'>) {
    const record = this.stamp(input);
    this.adminLogs.set(record.id, record);
    return record;
  }
  async listAdminLogs() {
    return [...this.adminLogs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getSetting(key: string) {
    return this.settings.get(key);
  }
  async setSetting(key: string, value: Record<string, unknown>) {
    const record: PlatformSettingRecord = { key, value, updatedAt: new Date().toISOString() };
    this.settings.set(key, record);
    return record;
  }
  async listSettings() {
    return [...this.settings.values()];
  }

  async listSuppressions(projectId: string) {
    return [...this.suppressions.values()].filter((s) => s.projectId === projectId);
  }
  async setSuppression(input: Omit<SuppressionRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    const key = `${input.projectId}:${input.fingerprint}`;
    const now = new Date().toISOString();
    const existing = [...this.suppressions.values()].find(
      (s) => s.projectId === input.projectId && s.fingerprint === input.fingerprint,
    );
    const record: SuppressionRecord = {
      id: existing?.id ?? randomUUID(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...input,
    };
    this.suppressions.set(key, record);
    return record;
  }
}

@Global()
@Module({
  providers: [
    {
      provide: Store,
      useFactory: (): Store => {
        if (process.env.DATABASE_URL) {
          // Loaded lazily so @prisma/client is only required in production.
          const { PrismaStore } = require('./prisma.store');
          Logger.log('Persistence: PostgreSQL (Prisma).', 'StoreModule');
          return new PrismaStore();
        }
        Logger.log('Persistence: in-memory store.', 'StoreModule');
        return new InMemoryStore();
      },
    },
  ],
  exports: [Store],
})
export class StoreModule {}
