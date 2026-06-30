import { Body, Controller, Get, Module, Patch } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { Store, StoreModule } from '../store/store.module';
import { AllowWithoutSubscription, Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { hasAppAccess } from '../billing/subscription';

class UpdateProfileDto {
  @IsString() @Length(1, 80)
  name!: string;
}

@Controller()
class OrgsController {
  constructor(private readonly store: Store) {}

  /** Update the authenticated user's own profile (display name). */
  @AllowWithoutSubscription()
  @Patch('me')
  async updateMe(@Auth() auth: AuthContext, @Body() dto: UpdateProfileDto) {
    const user = await this.store.updateUser(auth.user.id, { name: dto.name.trim() });
    return {
      id: auth.user.id,
      email: user?.email ?? auth.user.email,
      name: user?.name ?? dto.name.trim(),
    };
  }

  /** The authenticated user plus every org they belong to. */
  // Always reachable so the client can detect a missing subscription and route
  // the user to the paywall instead of getting a hard 402.
  @AllowWithoutSubscription()
  @Get('me')
  async me(@Auth() auth: AuthContext) {
    const memberships = await this.store.listMembershipsForUser(auth.user.id);
    const organizations = await Promise.all(
      memberships.map(async (m) => {
        const org = await this.store.getOrganization(m.orgId);
        return { id: m.orgId, name: org?.name, role: m.role };
      }),
    );
    const sub = await this.store.getSubscription(auth.org.id);
    return {
      user: { id: auth.user.id, email: auth.user.email, name: auth.user.name },
      activeOrg: { id: auth.org.id, name: auth.org.name, plan: auth.org.plan },
      role: auth.role,
      platformAdmin: auth.platformAdmin,
      organizations,
      subscription: {
        active: hasAppAccess(sub?.status),
        status: sub?.status ?? 'none',
        plan: sub?.plan ?? auth.org.plan,
      },
    };
  }

  /** Members of the active organization (Team Management). */
  @Get('orgs/members')
  @RequirePermission('project:read')
  async members(@Auth() auth: AuthContext) {
    const memberships = await this.store.listMembershipsForOrg(auth.org.id);
    return Promise.all(
      memberships.map(async (m) => {
        const user = await this.store.getUser(m.userId);
        return { userId: m.userId, email: user?.email, name: user?.name, role: m.role };
      }),
    );
  }

  /** Audit log for the active organization, with the actor resolved. Admins+. */
  @Get('orgs/audit-logs')
  @RequirePermission('member:manage')
  async auditLogs(@Auth() auth: AuthContext) {
    const logs = await this.store.listAuditLogs(auth.org.id);
    const recent = [...logs]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 200);

    // Resolve each distinct actor once.
    const actorIds = [...new Set(recent.map((l) => l.actorUserId).filter(Boolean))] as string[];
    const actors = new Map<string, { name?: string; email?: string }>();
    await Promise.all(
      actorIds.map(async (id) => {
        const u = await this.store.getUser(id);
        if (u) actors.set(id, { name: u.name, email: u.email });
      }),
    );

    return recent.map((l) => ({
      id: l.id,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      metadata: l.metadata,
      createdAt: l.createdAt,
      actor: l.actorUserId
        ? { id: l.actorUserId, ...(actors.get(l.actorUserId) ?? {}) }
        : null,
    }));
  }
}

@Module({
  imports: [StoreModule],
  controllers: [OrgsController],
})
export class OrgsModule {}
