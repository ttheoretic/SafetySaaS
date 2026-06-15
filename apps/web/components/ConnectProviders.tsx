'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';

// Providers with a live OAuth flow vs. ones that are connect-by-token for now.
const OAUTH_PROVIDERS = ['github'];
const OTHER_PROVIDERS = [
  'gitlab', 'bitbucket', 'aws', 'azure', 'gcp',
  'vercel', 'railway', 'render', 'supabase', 'neon', 'stripe',
];

export function ConnectProviders() {
  const { token, hydrated } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: api.listProjects,
    enabled: Boolean(token),
  });
  const [projectId, setProjectId] = useState<string>('');
  const activeProject = projectId || projects.data?.[0]?.id || '';

  if (!hydrated) return null;
  if (!token) {
    return (
      <p className="text-sm text-muted">
        <Link href="/login" className="text-accent hover:underline">Sign in</Link> to connect providers.
      </p>
    );
  }

  async function connect(provider: string) {
    if (!activeProject) {
      setError('Create a project first.');
      return;
    }
    setBusy(provider);
    setError(null);
    try {
      const { url } = await api.oauthAuthorizeUrl(provider, activeProject);
      window.location.href = url; // redirect into the provider's consent screen
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <div>
      {projects.data && projects.data.length > 0 && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-muted">Connect to project:</span>
          <select
            value={activeProject}
            onChange={(e) => setProjectId(e.target.value)}
            className="rounded-md border border-border bg-panel2 px-2 py-1 text-white"
          >
            {projects.data.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {OAUTH_PROVIDERS.map((p) => (
          <button
            key={p}
            onClick={() => connect(p)}
            disabled={busy === p}
            className="rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm capitalize text-white hover:bg-accent/20 disabled:opacity-50"
          >
            {busy === p ? 'Redirecting…' : `Connect ${p} (OAuth)`}
          </button>
        ))}
        {OTHER_PROVIDERS.map((p) => (
          <span
            key={p}
            className="rounded-md border border-border bg-panel2 px-3 py-1.5 text-sm capitalize text-muted"
            title="Token-based connection"
          >
            {p}
          </span>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
