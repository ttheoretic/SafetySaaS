'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { signInUser, supabaseEnabled } from '@/lib/sign-in';

/**
 * Sign-in. Uses Supabase email+password when configured (real access token,
 * verified by the API via SUPABASE_JWT_SECRET); otherwise a dev token. Then
 * calls /me, which provisions a personal org on first login.
 */
export default function LoginPage() {
  const router = useRouter();
  const signIn = useAuth((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token } = await signInUser(email, password);
      // Seed the store so the /me request carries the token.
      signIn(token, { id: '', email }, '');
      const me = await api.me();
      signIn(token, { id: me.user.id, email: me.user.email, name: me.user.name }, me.activeOrg.id);
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold text-foreground">Sign in to FailSafe AI</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {supabaseEnabled ? 'Sign in with your email and password.' : 'Dev sign-in (no Supabase configured).'}
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        {supabaseEnabled && (
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Continue'}
        </button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </div>
  );
}
