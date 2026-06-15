'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { signInUser, signUpUser } from '@/lib/sign-in';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const signIn = useAuth((s) => s.signIn);
  const [mode, setMode] = useState<Mode>('signin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token } =
        mode === 'signup'
          ? await signUpUser({ firstName, lastName, email, password })
          : await signInUser(email, password);
      // Seed the store so the /me request carries the token, then resolve the org.
      signIn(token, { id: '', email }, '');
      const me = await api.me();
      signIn(token, { id: me.user.id, email: me.user.email, name: me.user.name }, me.activeOrg.id);
      router.push(mode === 'signup' ? '/get-started' : '/dashboard');
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  const inputCls =
    'w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary';

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex rounded-lg border border-border bg-card p-1 text-sm">
        {(['signin', 'signup'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(null); }}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
              mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        ))}
      </div>

      <h1 className="text-2xl font-semibold text-foreground">
        {mode === 'signin' ? 'Welcome back' : 'Create your account'}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === 'signin' ? 'Sign in to your Riscly workspace.' : 'Start finding risks before your customers do.'}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        {mode === 'signup' && (
          <div className="flex gap-3">
            <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={inputCls} autoComplete="given-name" />
            <input required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className={inputCls} autoComplete="family-name" />
          </div>
        )}
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className={inputCls} autoComplete="email" />
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={inputCls} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />

        <button type="submit" disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {loading && <Loader2 className="size-4 animate-spin" />}
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }} className="text-primary hover:underline">
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}
