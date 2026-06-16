'use client';

import { mintDevToken } from './dev-token';
import { getSupabase } from './supabase';
import { getAuthConfig } from './auth-config';

export interface SignInResult {
  token: string;
}

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const MISSING_ANON =
  'The server uses Supabase auth, but NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in apps/web/.env.local.';

/** Sign in an existing user (email + password). Follows the server's auth mode. */
export async function signInUser(email: string, password: string): Promise<SignInResult> {
  const cfg = await getAuthConfig();
  if (cfg.supabase) {
    const sb = getSupabase(cfg.supabaseUrl);
    if (!sb) throw new Error(MISSING_ANON);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const token = data.session?.access_token;
    if (!token) throw new Error('Could not start a session. Please try again.');
    return { token };
  }
  return { token: mintDevToken({ sub: email, email, name: email.split('@')[0] }) };
}

/** Create a new account (name + email + password). Follows the server's auth mode. */
export async function signUpUser({ firstName, lastName, email, password }: SignUpInput): Promise<SignInResult> {
  const fullName = `${firstName} ${lastName}`.trim();
  const cfg = await getAuthConfig();
  if (cfg.supabase) {
    const sb = getSupabase(cfg.supabaseUrl);
    if (!sb) throw new Error(MISSING_ANON);
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName, full_name: fullName } },
    });
    if (error) throw new Error(error.message);
    const token = data.session?.access_token;
    if (!token) throw new Error('Account created. Check your email to confirm, then sign in.');
    return { token };
  }
  return { token: mintDevToken({ sub: email, email, name: fullName || email.split('@')[0] }) };
}
