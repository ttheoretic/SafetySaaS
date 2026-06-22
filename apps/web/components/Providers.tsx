'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-store';
import { getAuthConfig } from '@/lib/auth-config';
import { getSupabase } from '@/lib/supabase';

/** Client providers: React Query + auth hydration + Supabase token refresh. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Keep the stored access token fresh from the Supabase session. The Supabase
  // client persists + auto-refreshes its own session; we mirror the current
  // token into the store so long-lived tabs / reloads after a while don't 401
  // and wrongly bounce the user to the paywall.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getAuthConfig();
        if (cancelled || !cfg.supabase) return;
        const sb = getSupabase(cfg.supabaseUrl);
        if (!sb) return;
        const apply = (t?: string | null) => {
          if (t) useAuth.getState().setToken(t);
        };
        const { data } = await sb.auth.getSession();
        apply(data.session?.access_token);
        const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
          apply(session?.access_token);
        });
        unsubscribe = () => listener.subscription.unsubscribe();
      } catch {
        /* no Supabase / offline — dev tokens don't expire, so nothing to do */
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
