import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  Store, ProjectRecord, ScanRecord, ConnectionRecord, UserRecord,
  OrganizationRecord, SubscriptionRecord, MembershipRecord, AuditLogRecord,
  ScenarioRecord, InvitationRecord,
} from './store.module';

/**
 * PostgreSQL-backed repository (Prisma). Active when DATABASE_URL is set.
 * Maps between the domain records (ISO-string timestamps, JSON result caches)
 * and the Prisma rows defined in prisma/schema.prisma.
 */
export class PrismaStore extends Store {
  private readonly prisma = new PrismaClient();
  private readonly logger = new Logger(PrismaStore.name);

  private iso(d: Date | null | undefined): string | undefined {
    return d ? d.toISOString() : undefined;
  }

  // --- Projects ---
  async createProject(input: Omit<ProjectRecord, 'id' | 'createdAt'>) {
    const row = await this.prisma.project.create({
      data: {
        orgId: input.orgId,
        name: input.name,
        slug: input.slug,
        environment: input.environment as any,
      },
    });
    return this.toProject(row);
  }
  async listProjects(orgId: string) {
    const rows = await this.prisma.project.findMany({ where: { orgId } });
    return rows.map((r) => this.toProject(r));
  }
  async getProject(id: string) {
    const row = await this.prisma.project.findUnique({ where: { id } });
    return row ? this.toProject(row) : undefined;
  }
  private toProject(r: any): ProjectRecord {
    return {
      id: r.id, orgId: r.orgId, name: r.name, slug: r.slug,
      environment: r.environment, createdAt: r.createdAt.toISOString(),
    };
  }

  // --- Scans ---
  async createScan(input: Omit<ScanRecord, 'id' | 'createdAt'>) {
    const row = await this.prisma.scan.create({
      data: {
        orgId: input.orgId,
        projectId: input.projectId,
        status: input.status as any,
        graph: input.graph as any,
        reliabilityScore: input.reliabilityScore,
        findingsJson: input.findings as any,
        recommendationsJson: input.recommendations as any,
      },
    });
    return this.toScan(row);
  }
  async updateScan(id: string, patch: Partial<ScanRecord>) {
    try {
      const row = await this.prisma.scan.update({
        where: { id },
        data: {
          status: patch.status as any,
          graph: patch.graph as any,
          reliabilityScore: patch.reliabilityScore,
          findingsJson: patch.findings as any,
          recommendationsJson: patch.recommendations as any,
          finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : undefined,
        },
      });
      return this.toScan(row);
    } catch {
      return undefined;
    }
  }
  async getScan(id: string) {
    const row = await this.prisma.scan.findUnique({ where: { id } });
    return row ? this.toScan(row) : undefined;
  }
  async listScans(projectId: string) {
    const rows = await this.prisma.scan.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toScan(r));
  }
  private toScan(r: any): ScanRecord {
    return {
      id: r.id, orgId: r.orgId, projectId: r.projectId, status: r.status,
      graph: r.graph ?? undefined,
      reliabilityScore: r.reliabilityScore ?? undefined,
      findings: (r.findingsJson as unknown[]) ?? undefined,
      recommendations: (r.recommendationsJson as unknown[]) ?? undefined,
      createdAt: r.createdAt.toISOString(),
      finishedAt: this.iso(r.finishedAt),
    };
  }

  // --- Connections ---
  async createConnection(input: Omit<ConnectionRecord, 'id' | 'createdAt'>) {
    const row = await this.prisma.connection.create({
      data: {
        orgId: input.orgId,
        projectId: input.projectId,
        provider: input.provider as any,
        status: input.status as any,
        metadata: input.metadata as any,
        encryptedToken: input.encryptedToken ?? '',
      },
    });
    return this.toConnection(row);
  }
  async listConnections(projectId: string) {
    const rows = await this.prisma.connection.findMany({ where: { projectId } });
    return rows.map((r) => this.toConnection(r));
  }
  private toConnection(r: any): ConnectionRecord {
    return {
      id: r.id, orgId: r.orgId, projectId: r.projectId, provider: r.provider,
      status: r.status, metadata: r.metadata ?? {},
      encryptedToken: r.encryptedToken || undefined,
      createdAt: r.createdAt.toISOString(),
    };
  }

  // --- Users ---
  async createUser(input: Omit<UserRecord, 'id' | 'createdAt'>) {
    const row = await this.prisma.user.create({
      data: { supabaseId: input.supabaseId, email: input.email, name: input.name },
    });
    return this.toUser(row);
  }
  async getUserBySupabaseId(supabaseId: string) {
    const row = await this.prisma.user.findUnique({ where: { supabaseId } });
    return row ? this.toUser(row) : undefined;
  }
  async getUserByEmail(email: string) {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? this.toUser(row) : undefined;
  }
  async getUser(id: string) {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toUser(row) : undefined;
  }
  async updateUser(id: string, patch: { supabaseId?: string; email?: string; name?: string }) {
    const row = await this.prisma.user.update({
      where: { id },
      data: { supabaseId: patch.supabaseId, email: patch.email, name: patch.name },
    });
    return this.toUser(row);
  }
  private toUser(r: any): UserRecord {
    return {
      id: r.id, supabaseId: r.supabaseId, email: r.email,
      name: r.name ?? undefined, createdAt: r.createdAt.toISOString(),
    };
  }

  // --- Organizations ---
  async createOrganization(input: Omit<OrganizationRecord, 'id' | 'createdAt'>) {
    const row = await this.prisma.organization.create({
      data: { name: input.name, slug: input.slug, plan: input.plan as any },
    });
    return this.toOrg(row);
  }
  async getOrganization(id: string) {
    const row = await this.prisma.organization.findUnique({ where: { id } });
    return row ? this.toOrg(row) : undefined;
  }
  async updateOrganization(id: string, patch: Partial<OrganizationRecord>) {
    try {
      const row = await this.prisma.organization.update({
        where: { id },
        data: { name: patch.name, plan: patch.plan as any },
      });
      return this.toOrg(row);
    } catch {
      return undefined;
    }
  }
  private toOrg(r: any): OrganizationRecord {
    return {
      id: r.id, name: r.name, slug: r.slug, plan: r.plan,
      createdAt: r.createdAt.toISOString(),
    };
  }

  // --- Subscriptions ---
  async upsertSubscription(sub: SubscriptionRecord) {
    await this.prisma.subscription.upsert({
      where: { orgId: sub.orgId },
      create: {
        orgId: sub.orgId, plan: sub.plan as any, status: sub.status,
        stripeCustomerId: sub.stripeCustomerId,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : undefined,
      },
      update: {
        plan: sub.plan as any, status: sub.status,
        stripeCustomerId: sub.stripeCustomerId,
        stripeSubscriptionId: sub.stripeSubscriptionId,
      },
    });
    return sub;
  }
  async getSubscription(orgId: string) {
    const row = await this.prisma.subscription.findUnique({ where: { orgId } });
    if (!row) return undefined;
    return {
      orgId: row.orgId, plan: row.plan as OrganizationRecord['plan'],
      status: row.status,
      stripeCustomerId: row.stripeCustomerId ?? undefined,
      stripeSubscriptionId: row.stripeSubscriptionId ?? undefined,
      currentPeriodEnd: this.iso(row.currentPeriodEnd),
    };
  }

  // --- Memberships ---
  async addMembership(input: Omit<MembershipRecord, 'id' | 'createdAt'>) {
    const row = await this.prisma.membership.create({
      data: { orgId: input.orgId, userId: input.userId, role: input.role as any },
    });
    return this.toMembership(row);
  }
  async getMembership(orgId: string, userId: string) {
    const row = await this.prisma.membership.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
    return row ? this.toMembership(row) : undefined;
  }
  async listMembershipsForUser(userId: string) {
    const rows = await this.prisma.membership.findMany({ where: { userId } });
    return rows.map((r) => this.toMembership(r));
  }
  async listMembershipsForOrg(orgId: string) {
    const rows = await this.prisma.membership.findMany({ where: { orgId } });
    return rows.map((r) => this.toMembership(r));
  }
  private toMembership(r: any): MembershipRecord {
    return {
      id: r.id, orgId: r.orgId, userId: r.userId, role: r.role,
      createdAt: r.createdAt.toISOString(),
    };
  }

  // --- Audit logs ---
  async addAuditLog(input: Omit<AuditLogRecord, 'id' | 'createdAt'>) {
    const row = await this.prisma.auditLog.create({
      data: {
        orgId: input.orgId, actorUserId: input.actorUserId, action: input.action,
        targetType: input.targetType, targetId: input.targetId,
        metadata: input.metadata as any,
      },
    });
    return this.toAudit(row);
  }
  async listAuditLogs(orgId: string) {
    const rows = await this.prisma.auditLog.findMany({
      where: { orgId }, orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toAudit(r));
  }
  private toAudit(r: any): AuditLogRecord {
    return {
      id: r.id, orgId: r.orgId, actorUserId: r.actorUserId ?? undefined,
      action: r.action, targetType: r.targetType ?? undefined,
      targetId: r.targetId ?? undefined, metadata: r.metadata ?? {},
      createdAt: r.createdAt.toISOString(),
    };
  }

  // --- Scenarios ---
  async createScenario(input: Omit<ScenarioRecord, 'id' | 'createdAt'>) {
    const row = await this.prisma.scenario.create({
      data: {
        orgId: input.orgId, projectId: input.projectId, name: input.name,
        prompt: input.prompt, definition: input.definition as any,
      },
    });
    return this.toScenario(row);
  }
  async getScenario(id: string) {
    const row = await this.prisma.scenario.findUnique({ where: { id } });
    return row ? this.toScenario(row) : undefined;
  }
  async updateScenario(id: string, patch: Partial<ScenarioRecord>) {
    try {
      const row = await this.prisma.scenario.update({
        where: { id },
        data: { lastResult: patch.lastResult as any },
      });
      return this.toScenario(row);
    } catch {
      return undefined;
    }
  }
  async listScenarios(projectId: string) {
    const rows = await this.prisma.scenario.findMany({
      where: { projectId }, orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toScenario(r));
  }
  private toScenario(r: any): ScenarioRecord {
    return {
      id: r.id, orgId: r.orgId, projectId: r.projectId, name: r.name,
      prompt: r.prompt, definition: r.definition ?? {},
      lastResult: r.lastResult ?? undefined,
      createdAt: r.createdAt.toISOString(),
    };
  }

  // --- Invitations ---
  async createInvitation(input: Omit<InvitationRecord, 'id' | 'createdAt'>) {
    const row = await this.prisma.invitation.create({
      data: {
        orgId: input.orgId, email: input.email, role: input.role as any,
        token: input.token, invitedById: input.invitedById,
      },
    });
    return this.toInvitation(row);
  }
  async getInvitationByToken(token: string) {
    const row = await this.prisma.invitation.findUnique({ where: { token } });
    return row ? this.toInvitation(row) : undefined;
  }
  async listInvitations(orgId: string) {
    const rows = await this.prisma.invitation.findMany({
      where: { orgId, acceptedAt: null }, orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toInvitation(r));
  }
  async markInvitationAccepted(id: string) {
    try {
      const row = await this.prisma.invitation.update({
        where: { id }, data: { acceptedAt: new Date() },
      });
      return this.toInvitation(row);
    } catch {
      return undefined;
    }
  }
  private toInvitation(r: any): InvitationRecord {
    return {
      id: r.id, orgId: r.orgId, email: r.email, role: r.role, token: r.token,
      invitedById: r.invitedById,
      acceptedAt: this.iso(r.acceptedAt),
      createdAt: r.createdAt.toISOString(),
    };
  }
}
