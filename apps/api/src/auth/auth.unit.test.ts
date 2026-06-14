import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { devToken, verifyToken } from './jwt';
import { roleHasPermission, ROLE_PERMISSIONS } from './roles';

function signHs256(payload: object, secret: string): string {
  const enc = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = enc({ alg: 'HS256', typ: 'JWT' });
  const body = enc(payload);
  const sig = createHmac('sha256', secret)
    .update(`${head}.${body}`)
    .digest('base64url');
  return `${head}.${body}.${sig}`;
}

describe('JWT verification', () => {
  it('accepts dev tokens only when no secret is configured', () => {
    const t = devToken({ sub: 'u1', email: 'a@b.c' });
    expect(verifyToken(t, undefined)?.sub).toBe('u1');
    // With a real secret set, unsigned dev tokens are refused.
    expect(verifyToken(t, 'super-secret')).toBeNull();
  });

  it('verifies a valid HS256 Supabase-style token', () => {
    const secret = 'super-secret';
    const token = signHs256({ sub: 'u2', email: 'x@y.z' }, secret);
    expect(verifyToken(token, secret)?.sub).toBe('u2');
  });

  it('rejects a token signed with the wrong secret', () => {
    const token = signHs256({ sub: 'u3' }, 'real');
    expect(verifyToken(token, 'attacker')).toBeNull();
  });

  it('rejects an expired token', () => {
    const secret = 's';
    const token = signHs256({ sub: 'u4', exp: 1 }, secret); // 1970
    expect(verifyToken(token, secret)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(verifyToken('not-a-jwt', 's')).toBeNull();
    expect(verifyToken('a.b', 's')).toBeNull();
  });
});

describe('RBAC', () => {
  it('owner has every permission', () => {
    expect(roleHasPermission('owner', 'org:manage')).toBe(true);
    expect(roleHasPermission('owner', 'billing:manage')).toBe(true);
  });

  it('viewer is read-only', () => {
    expect(roleHasPermission('viewer', 'project:read')).toBe(true);
    expect(roleHasPermission('viewer', 'project:write')).toBe(false);
    expect(roleHasPermission('viewer', 'scan:run')).toBe(false);
  });

  it('member can run scans but not manage members', () => {
    expect(roleHasPermission('member', 'scan:run')).toBe(true);
    expect(roleHasPermission('member', 'member:manage')).toBe(false);
  });

  it('admin can manage members but not the org', () => {
    expect(roleHasPermission('admin', 'member:manage')).toBe(true);
    expect(roleHasPermission('admin', 'org:manage')).toBe(false);
  });

  it('permissions are monotonic up the role hierarchy', () => {
    for (const perm of ROLE_PERMISSIONS.viewer) {
      expect(roleHasPermission('member', perm)).toBe(true);
      expect(roleHasPermission('admin', perm)).toBe(true);
      expect(roleHasPermission('owner', perm)).toBe(true);
    }
  });
});
