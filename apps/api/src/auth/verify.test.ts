import { describe, it, expect, afterEach } from 'vitest';
import { SignJWT } from 'jose';
import { verifyAuthToken } from './verify';
import { devToken } from './jwt';

afterEach(() => {
  delete process.env.SUPABASE_JWT_SECRET;
  delete process.env.SUPABASE_URL;
});

describe('verifyAuthToken', () => {
  it('accepts dev tokens in dev mode (no Supabase configured)', async () => {
    const claims = await verifyAuthToken(devToken({ sub: 'u1', email: 'a@b.c' }));
    expect(claims?.sub).toBe('u1');
  });

  it('verifies a Supabase HS256 token and extracts the name from user_metadata', async () => {
    process.env.SUPABASE_JWT_SECRET = 'super-secret';
    const token = await new SignJWT({ email: 'x@y.z', user_metadata: { full_name: 'Max Mustermann' } })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u2')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('super-secret'));
    const claims = await verifyAuthToken(token);
    expect(claims?.sub).toBe('u2');
    expect(claims?.email).toBe('x@y.z');
    expect(claims?.name).toBe('Max Mustermann');
  });

  it('rejects a token signed with the wrong secret', async () => {
    process.env.SUPABASE_JWT_SECRET = 'real';
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' }).setSubject('u3').setExpirationTime('1h')
      .sign(new TextEncoder().encode('attacker'));
    expect(await verifyAuthToken(token)).toBeNull();
  });

  it('refuses dev tokens once Supabase is configured', async () => {
    process.env.SUPABASE_JWT_SECRET = 'super-secret';
    expect(await verifyAuthToken(devToken({ sub: 'u4', email: 'a@b.c' }))).toBeNull();
  });
});
