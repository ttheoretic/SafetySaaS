'use client';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface AuthConfig {
  supabase: boolean;
  supabaseUrl: string | null;
}

let cached: Promise<AuthConfig> | null = null;

/** The server's auth mode, so the frontend signs in the same way the backend
 *  verifies. Cached; falls back to dev mode if the API is unreachable. */
export function getAuthConfig(): Promise<AuthConfig> {
  if (!cached) {
    cached = fetch(`${BASE}/api/auth/config`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { supabase: false, supabaseUrl: null }))
      .catch(() => ({ supabase: false, supabaseUrl: null }));
  }
  return cached;
}
