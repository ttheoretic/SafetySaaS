import { Controller, Get, Module } from '@nestjs/common';
import { Store, StoreModule } from '../store/store.module';
import { Auth, AuthContext, RequirePermission } from '../auth/auth-context';

@Controller()
class OrgsController {
  constructor(private readonly store: Store) {}

  /** The authenticated user plus every org they belong to. */
  @Get('me')
  async me(@Auth() auth: AuthContext) {
    const memberships = await this.store.listMembershipsForUser(auth.user.id);
    const organizations = await Promise.all(
      memberships.map(async (m) => {
        const org = await this.store.getOrganization(m.orgId);
        return { id: m.orgId, name: org?.name, role: m.role };
      }),
    );
    return {
      user: { id: auth.user.id, email: auth.user.email, name: auth.user.name },
      activeOrg: { id: auth.org.id, name: auth.org.name, plan: auth.org.plan },
      role: auth.role,
      organizations,
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
