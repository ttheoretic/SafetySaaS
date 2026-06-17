'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-store';
import { api } from '@/lib/api';

/**
 * Client-side paywall for the dashboard. Requires a signed-in user with an
 * active subscription; otherwise it routes to /login or the /billing paywall
 * (which lives outside this layout, so it renders full-screen without the
 * dashboard chrome). When the backend doesn't enforce billing (dev), it reports
 * `subscription.active = true` and the gate is a no-op.
 */
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [state, setState] = useState<'checking' | 'ok'>('checking');

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await api.me();
        if (cancelled) return;
        if (me.subscription.active) setState('ok');
        else router.replace('/billing');
      } catch {
        if (!cancelled) router.replace('/login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, token, router]);

  if (state !== 'ok') {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}
