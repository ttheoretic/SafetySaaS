'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let clientUrl = '';

/**
 * Lazily create the Supabase client for the given project URL (provided by the
 * backend's /auth/config). The anon key comes from the web env. Returns null
 * when the anon key is missing.
 */
export function getSupabase(url: string | null): SupabaseClient | null {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  if (!client || clientUrl !== url) {
    client = createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } });
    clientUrl = url;
  }
  return client;
}
