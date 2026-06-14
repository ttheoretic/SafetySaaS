import { Injectable } from '@nestjs/common';
import { Store, UserRecord, OrganizationRecord } from '../store/store.module';
import { AuthClaims } from './jwt';

/**
 * Resolves an authenticated identity into a local user + tenant context,
 * provisioning on first sight (just-in-time onboarding): a new user gets a
 * personal organization with an `owner` membership. This mirrors how a real
 * Supabase-backed signup would seed the tenant.
 */
@Injectable()
export class AuthService {
  constructor(private readonly store: Store) {}

  resolveUser(claims: AuthClaims): UserRecord {
    const existing = this.store.getUserBySupabaseId(claims.sub);
    if (existing) return existing;

    const user = this.store.createUser({
      supabaseId: claims.sub,
      email: claims.email ?? `${claims.sub}@users.failsafe.ai`,
      name: claims.name,
    });
    // First-login: give the user a personal org they own.
    this.provisionPersonalOrg(user);
    return user;
  }

  private provisionPersonalOrg(user: UserRecord): OrganizationRecord {
    const base = (user.name ?? user.email.split('@')[0] ?? 'workspace')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const org = this.store.createOrganization({
      name: `${user.name ?? user.email.split('@')[0]}'s Workspace`,
      slug: `${base || 'workspace'}-${user.id.slice(0, 6)}`,
      plan: 'starter',
    });
    this.store.addMembership({ orgId: org.id, userId: user.id, role: 'owner' });
    return org;
  }

  /** The org the request targets: the `x-org-id` header, else the user's first. */
  resolveOrg(user: UserRecord, requestedOrgId?: string) {
    const memberships = this.store.listMembershipsForUser(user.id);
    if (!memberships.length) return undefined;

    const membership = requestedOrgId
      ? memberships.find((m) => m.orgId === requestedOrgId)
      : memberships[0];
    if (!membership) return undefined;

    const org = this.store.getOrganization(membership.orgId);
    if (!org) return undefined;
    return { org, role: membership.role };
  }
}
