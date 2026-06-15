'use client';

import { mintDevToken } from './dev-token';
import { supabase, supabaseEnabled } from './supabase';

export interface SignInResult {
  token: string;
}

/**
 * Unified sign-in. With Supabase configured it signs in (or signs up) with
 * email + password and returns the real access token, which the API verifies
 * via SUPABASE_JWT_SECRET. Without Supabase it mints a dev token. Either way
 * the rest of the app just gets an opaque Bearer token.
 */
export async function signInUser(email: string, password?: string): Promise<SignInResult> {
  if (supabaseEnabled && supabase) {
    if (!password) throw new Error('Password required');
    const res = await supabase.auth.signInWithPassword({ email, password });
    let session = res.data.session;
    let err = res.error;
    // First-time users: create the account, then they're signed in.
    if (err && /invalid login credentials/i.test(err.message)) {
      const su = await supabase.auth.signUp({ email, password });
      session = su.data.session;
      err = su.error;
    }
    if (err) throw new Error(err.message);
    const token = session?.access_token;
    if (!token) throw new Error('Check your email to confirm your account, then sign in.');
    return { token };
  }
  return { token: mintDevToken({ sub: email, email, name: email.split('@')[0] }) };
}

export { supabaseEnabled };
