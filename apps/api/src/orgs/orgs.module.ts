import { Controller, Get, Module } from '@nestjs/common';
import { Store, StoreModule } from '../store/store.module';
import { AllowWithoutSubscription, Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { hasAppAccess } from '../billing/subscription';

@Controller()
class OrgsController {
  constructor(private readonly store: Store) {}

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

  /** Audit log for the active organization. Admins+ only. */
  @Get('orgs/audit-logs')
  @RequirePermission('member:manage')
  auditLogs(@Auth() auth: AuthContext) {
    return this.store.listAuditLogs(auth.org.id);
  }
}

@Module({
  imports: [StoreModule],
  controllers: [OrgsController],
})
export class OrgsModule {}
