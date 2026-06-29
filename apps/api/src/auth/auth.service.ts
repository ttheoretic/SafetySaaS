import { Inject, Injectable, Logger } from '@nestjs/common';
import { Store, UserRecord, OrganizationRecord } from '../store/store.module';
import { EMAIL_PROVIDER, EmailProvider, senderFor } from '../email/email.module';
import { buildWelcomeEmail } from '../email/templates';
import { AuthClaims } from './jwt';

/**
 * Resolves an authenticated identity into a local user + tenant context,
 * provisioning on first sight (just-in-time onboarding): a new user gets a
 * personal organization with an `owner` membership. This mirrors how a real
 * Supabase-backed signup would seed the tenant.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly store: Store,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
  ) {}

  async resolveUser(claims: AuthClaims): Promise<UserRecord> {
    const email = claims.email ?? `${claims.sub}@users.riscly.ai`;
    let user = await this.store.getUserBySupabaseId(claims.sub);

    if (!user) {
      try {
        user = await this.store.createUser({
          supabaseId: claims.sub,
          email,
          name: claims.name,
        });
        // Best-effort welcome (product sender). Never blocks sign-in.
        const welcome = buildWelcomeEmail(claims.name, process.env.APP_URL);
        void this.email
          .send({ to: email, from: senderFor('product'), ...welcome })
          .catch((e) => this.logger.warn(`Welcome email failed: ${(e as Error).message}`));
      } catch (err) {
        if ((err as { code?: string }).code !== 'P2002') throw err;
        // Unique-constraint clash. Either a concurrent first-login race (same
        // supabaseId) or an existing account with this email under a different
        // supabaseId (e.g. the Supabase identity was recreated). Reconcile:
        user = await this.store.getUserBySupabaseId(claims.sub);
        if (!user) {
          const byEmail = await this.store.getUserByEmail(email);
          if (byEmail) {
            // Re-link this Supabase identity to the existing workspace.
            user =
              (await this.store.updateUser(byEmail.id, {
                supabaseId: claims.sub,
                name: claims.name ?? byEmail.name,
              })) ?? byEmail;
          }
        }
      }
    }
    if (!user) throw new Error('Failed to resolve user after creation');

    // Ensure the user owns a personal org (idempotent — survives the race and
    // any earlier attempt that created the user but not the org).
    const memberships = await this.store.listMembershipsForUser(user.id);
    if (memberships.length === 0) {
      try {
        await this.provisionPersonalOrg(user);
      } catch (err) {
        // Another request is provisioning concurrently (unique slug clash).
        if ((err as { code?: string }).code !== 'P2002') throw err;
      }
    }
    return user;
  }

  private async provisionPersonalOrg(user: UserRecord): Promise<OrganizationRecord> {
    const base = (user.name ?? user.email.split('@')[0] ?? 'workspace')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const org = await this.store.createOrganization({
      name: `${user.name ?? user.email.split('@')[0]}'s Workspace`,
      slug: `${base || 'workspace'}-${user.id.slice(0, 6)}`,
      plan: 'starter',
    });
    await this.store.addMembership({ orgId: org.id, userId: user.id, role: 'owner' });
    return org;
  }

  /** The org the request targets: the `x-org-id` header, else the user's first. */
  async resolveOrg(user: UserRecord, requestedOrgId?: string) {
    const memberships = await this.store.listMembershipsForUser(user.id);
    if (!memberships.length) return undefined;

    const membership = requestedOrgId
      ? memberships.find((m) => m.orgId === requestedOrgId)
      : memberships[0];
    if (!membership) return undefined;

    const org = await this.store.getOrganization(membership.orgId);
    if (!org) return undefined;
    return { org, role: membership.role };
  }
}
