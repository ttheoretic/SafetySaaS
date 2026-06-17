'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, ShieldCheck, LogOut } from 'lucide-react';
import { PLAN_LIMITS, type Plan } from '@riscly/shared';
import { api, type MeResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';

const FEATURES: Record<Plan, string[]> = {
  starter: ['1 project', '10 scans / day', 'Up to 2 members'],
  growth: ['5 projects', '100 scans / day', 'AI predictions', 'PDF reports', 'Up to 10 members'],
  pro: ['25 projects', '1,000 scans / day', 'AI predictions', 'PDF reports', 'Up to 50 members'],
  enterprise: ['Unlimited projects', 'Unlimited scans', 'SSO & priority support', 'Custom limits'],
};

export default function BillingPage() {
  const router = useRouter();
  const { token, hydrated, signOut } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [busy, setBusy] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canceled, setCanceled] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    setCanceled(new URLSearchParams(window.location.search).get('canceled') === '1');
    api
      .me()
      .then((m) => {
        // Already subscribed → no reason to sit on the paywall.
        if (m.subscription.active) router.replace('/dashboard');
        else setMe(m);
      })
      .catch(() => {});
  }, [hydrated, token, router]);

  async function subscribe(plan: Plan) {
    setBusy(plan); setError(null);
    try {
      const { url } = await api.checkout(plan);
      window.location.href = url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
          <ShieldCheck className="size-3.5" /> Choose a plan to unlock Riscly
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Activate your workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Riscly needs an active subscription. Pick a plan to start analyzing your architecture.
        </p>
      </div>

      {canceled && (
        <p className="mb-6 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-center text-sm text-warning">
          Checkout was canceled — pick a plan whenever you’re ready.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {(['starter', 'growth', 'pro'] as Plan[]).map((plan) => {
          const limits = PLAN_LIMITS[plan];
          return (
            <div key={plan} className={`flex flex-col rounded-2xl border p-6 ${plan === 'growth' ? 'border-primary' : 'border-border'} bg-card`}>
              {plan === 'growth' && (
                <span className="mb-2 inline-block w-fit rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">Most popular</span>
              )}
              <h2 className="text-lg font-semibold capitalize text-foreground">{plan}</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-mono text-3xl font-semibold text-foreground">€{limits.priceEur}</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                {FEATURES[plan].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe(plan)}
                disabled={!!busy}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy === plan && <Loader2 className="size-4 animate-spin" />}
                Subscribe
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
        <a href="mailto:sales@riscly.ai" className="text-primary hover:underline">Talk to us about Enterprise</a>
        <span className="text-border">·</span>
        <button onClick={() => { signOut(); router.replace('/login'); }} className="inline-flex items-center gap-1 hover:text-foreground">
          <LogOut className="size-3.5" /> Sign out
        </button>
      </div>
      {error && <p className="mt-4 text-center text-sm text-warning">{error}</p>}
    </div>
  );
}
