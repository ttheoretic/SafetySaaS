'use client';

import { mintDevToken } from './dev-token';
import { supabase, supabaseEnabled } from './supabase';

export interface SignInResult {
  token: string;
}

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

/** Sign in an existing user (email + password). */
export async function signInUser(email: string, password: string): Promise<SignInResult> {
  if (supabaseEnabled && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const token = data.session?.access_token;
    if (!token) throw new Error('Could not start a session. Please try again.');
    return { token };
  }
  return { token: mintDevToken({ sub: email, email, name: email.split('@')[0] }) };
}

/** Create a new account (name + email + password), returning an access token. */
export async function signUpUser({ firstName, lastName, email, password }: SignUpInput): Promise<SignInResult> {
  const fullName = `${firstName} ${lastName}`.trim();
  if (supabaseEnabled && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName, full_name: fullName } },
    });
    if (error) throw new Error(error.message);
    const token = data.session?.access_token;
    // If email confirmation is required, there is no session yet.
    if (!token) throw new Error('Account created. Check your email to confirm, then sign in.');
    return { token };
  }
  return { token: mintDevToken({ sub: email, email, name: fullName || email.split('@')[0] }) };
}

export { supabaseEnabled };
