import { jwtVerify, createRemoteJWKSet, JWTPayload } from 'jose';
import { AuthClaims, verifyToken as verifyDevOrHs256 } from './jwt';

/**
 * Verifies an incoming bearer token against the configured auth mode:
 *
 *  - **Dev mode** (no SUPABASE_JWT_SECRET and no SUPABASE_URL): accepts the
 *    unsigned `dev.` tokens issued by the local sign-in.
 *  - **Supabase mode** (either configured): verifies a real Supabase JWT.
 *    Uses the shared HS256 secret when SUPABASE_JWT_SECRET is set, otherwise
 *    the project's JWKS endpoint (asymmetric RS256/ES256 — the default for new
 *    Supabase projects). Dev tokens are refused in this mode.
 */

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksUrl = '';

function jwks(supabaseUrl: string) {
  const url = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/.well-known/jwks.json`;
  if (!jwksCache || jwksUrl !== url) {
    jwksCache = createRemoteJWKSet(new URL(url));
    jwksUrl = url;
  }
  return jwksCache;
}

function toClaims(p: JWTPayload): AuthClaims | null {
  if (!p.sub) return null;
  const meta = (p.user_metadata as Record<string, unknown> | undefined) ?? {};
  const name = (meta.full_name as string) ?? (meta.name as string) ?? undefined;
  return { sub: String(p.sub), email: p.email as string | undefined, name, ...p };
}

export async function verifyAuthToken(token: string): Promise<AuthClaims | null> {
  const secret = process.env.SUPABASE_JWT_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseMode = Boolean(secret || supabaseUrl);

  if (!supabaseMode) {
    // Local dev: accept dev tokens (and HS256 if a secret were passed).
    return verifyDevOrHs256(token, undefined);
  }
  if (token.startsWith('dev.')) return null; // unsigned tokens not allowed here

  try {
    if (secret) {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      return toClaims(payload);
    }
    const { payload } = await jwtVerify(token, jwks(supabaseUrl!));
    return toClaims(payload);
  } catch {
    return null;
  }
}
