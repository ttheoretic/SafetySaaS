import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Minimal, dependency-free JWT handling.
 *
 * Production: verifies Supabase access tokens (HS256, signed with the project's
 * JWT secret). Dev/local: when no SUPABASE_JWT_SECRET is configured, accepts an
 * unsigned `dev.<base64url-json>` token so the API is usable and testable
 * without standing up Supabase.
 */

export interface AuthClaims {
  /** Stable user id (Supabase `sub`). */
  sub: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Issue a dev token (used by tests / local onboarding). */
export function devToken(claims: AuthClaims): string {
  return `dev.${b64urlEncode(Buffer.from(JSON.stringify(claims)))}`;
}

export function verifyToken(token: string, secret?: string): AuthClaims | null {
  // Dev token path — only honored when no real secret is configured.
  if (token.startsWith('dev.')) {
    if (secret) return null; // refuse unsigned tokens in production
    try {
      return JSON.parse(b64urlDecode(token.slice(4)).toString('utf8')) as AuthClaims;
    } catch {
      return null;
    }
  }

  if (!secret) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string };
  try {
    header = JSON.parse(b64urlDecode(headerB64).toString('utf8'));
  } catch {
    return null;
  }
  if (header.alg !== 'HS256') return null;

  const expected = createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const provided = b64urlDecode(signatureB64);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return null;
  }

  let payload: AuthClaims & { exp?: number };
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8'));
  } catch {
    return null;
  }
  if (payload.exp && Date.now() / 1000 > payload.exp) return null;
  if (!payload.sub) return null;
  return payload;
}
