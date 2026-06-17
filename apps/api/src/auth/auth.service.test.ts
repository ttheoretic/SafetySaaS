import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStore } from '../store/store.module';
import { AuthService } from './auth.service';

describe('AuthService.resolveUser (first-login provisioning)', () => {
  let store: InMemoryStore;
  let auth: AuthService;

  beforeEach(() => {
    store = new InMemoryStore();
    auth = new AuthService(store);
  });

  it('provisions a user + personal org on first login', async () => {
    const user = await auth.resolveUser({ sub: 'sub-1', email: 'a@b.c', name: 'Ann' });
    expect(user.email).toBe('a@b.c');
    const memberships = await store.listMembershipsForUser(user.id);
    expect(memberships).toHaveLength(1);
    expect(memberships[0].role).toBe('owner');
  });

  it('returns the same user on subsequent logins (no duplicate org)', async () => {
    const first = await auth.resolveUser({ sub: 'sub-1', email: 'a@b.c' });
    const second = await auth.resolveUser({ sub: 'sub-1', email: 'a@b.c' });
    expect(second.id).toBe(first.id);
    expect(await store.listMembershipsForUser(first.id)).toHaveLength(1);
  });

  it('re-links a recreated Supabase identity (same email, new sub) to the existing workspace', async () => {
    const original = await auth.resolveUser({ sub: 'old-sub', email: 'a@b.c', name: 'Ann' });
    // Same person signs in with a freshly created Supabase account (new sub).
    const relinked = await auth.resolveUser({ sub: 'new-sub', email: 'a@b.c' });
    expect(relinked.id).toBe(original.id); // same workspace, not a new user
    expect(relinked.supabaseId).toBe('new-sub');
    // And the next login resolves directly by the new sub.
    const again = await auth.resolveUser({ sub: 'new-sub', email: 'a@b.c' });
    expect(again.id).toBe(original.id);
  });

  it('ensures an org even if a user row exists without one', async () => {
    const orphan = await store.createUser({ supabaseId: 'sub-x', email: 'x@y.z' });
    expect(await store.listMembershipsForUser(orphan.id)).toHaveLength(0);
    const resolved = await auth.resolveUser({ sub: 'sub-x', email: 'x@y.z' });
    expect(resolved.id).toBe(orphan.id);
    expect(await store.listMembershipsForUser(orphan.id)).toHaveLength(1);
  });
});
