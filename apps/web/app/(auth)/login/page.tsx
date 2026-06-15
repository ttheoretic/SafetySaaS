'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mintDevToken } from '@/lib/dev-token';
import { useAuth } from '@/lib/auth-store';
import { api } from '@/lib/api';

/**
 * Dev sign-in: mints a dev token from an email and calls /me (which provisions
 * a personal org on first login). In production this screen is replaced by a
 * Supabase magic-link / OAuth flow that yields a real access token — the rest
 * of the app is unchanged.
 */
export default function LoginPage() {
  const router = useRouter();
  const signIn = useAuth((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const token = mintDevToken({ sub: email, email, name: email.split('@')[0] });
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
        Dev sign-in. In production this is a Supabase login.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-md border border-border bg-panel2 px-3 py-2 text-sm text-white outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Continue'}
        </button>
        {error && <p className="text-sm text-bad">{error}</p>}
      </form>
    </div>
  );
}
