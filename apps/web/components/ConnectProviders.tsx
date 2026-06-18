'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plug, Loader2, ChevronRight } from 'lucide-react';
import {
  INTEGRATIONS, INTEGRATION_CATEGORIES, type Integration,
} from '@riscly/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';

const STATUS_BADGE: Record<Integration['status'], { label: string; cls: string }> = {
  live: { label: 'Live', cls: 'bg-success/15 text-success' },
  beta: { label: 'Beta', cls: 'bg-warning/15 text-warning' },
  planned: { label: 'Planned', cls: 'bg-muted/30 text-muted-foreground' },
};

const AUTH_HINT: Record<Integration['auth'], string> = {
  oauth: 'OAuth',
  token: 'API token',
  role: 'Access key / role',
  planned: '',
};

export function ConnectProviders() {
  const { token, hydrated } = useAuth();
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const projects = useQuery({ queryKey: ['projects'], queryFn: api.listProjects, enabled: Boolean(token) });
  const activeProject = projectId || projects.data?.[0]?.id || '';

  const connections = useQuery({
    queryKey: ['connections', activeProject],
    queryFn: () => api.listConnections(activeProject),
    enabled: Boolean(token && activeProject),
  });
  const connected = new Set((connections.data ?? []).map((c) => c.provider));

  if (!hydrated) return null;
  if (!token) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">Sign in</Link> to connect providers.
      </p>
    );
  }

  async function connectOAuth(provider: string) {
    if (!activeProject) return setError('Create a project first.');
    setBusy(provider); setError(null);
    try {
      const { url } = await api.oauthAuthorizeUrl(provider, activeProject);
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function connectToken(provider: string) {
    if (!activeProject) return setError('Create a project first.');
    setBusy(provider); setError(null);
    try {
      await api.createConnection(activeProject, { provider, token: tokenInput || undefined });
      setOpenForm(null); setTokenInput('');
      qc.invalidateQueries({ queryKey: ['connections', activeProject] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {projects.data && projects.data.length > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Project:</span>
          <select
            value={activeProject}
            onChange={(e) => setProjectId(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
          >
            {projects.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      <div className="space-y-5">
        {INTEGRATION_CATEGORIES.map((cat) => {
          const items = INTEGRATIONS.filter((i) => i.category === cat.key);
          if (!items.length) return null;
          return (
            <div key={cat.key}>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{cat.label}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {items.map((i) => {
                  const isConnected = connected.has(i.id);
                  const isPlanned = i.status === 'planned';
                  const formOpen = openForm === i.id;
                  return (
                    <div key={i.id} className="rounded-xl border border-border bg-card p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{i.name}</span>
                            <span className={'rounded px-1.5 py-0.5 text-[10px] font-medium ' + STATUS_BADGE[i.status].cls}>
                              {STATUS_BADGE[i.status].label}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.discovers.join(' · ')}</p>
                        </div>
                        {isConnected ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-success/15 px-2 py-1 text-xs font-medium text-success">
                            <Check className="size-3.5" /> Connected
                          </span>
                        ) : isPlanned ? (
                          <span className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">Soon</span>
                        ) : i.auth === 'oauth' ? (
                          <button
                            onClick={() => connectOAuth(i.id)}
                            disabled={busy === i.id}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                          >
                            {busy === i.id ? <Loader2 className="size-3.5 animate-spin" /> : <Plug className="size-3.5" />}
                            Connect
                          </button>
                        ) : (
                          <button
                            onClick={() => { setOpenForm(formOpen ? null : i.id); setTokenInput(''); setError(null); }}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
                          >
                            Connect <ChevronRight className={'size-3.5 transition-transform ' + (formOpen ? 'rotate-90' : '')} />
                          </button>
                        )}
                      </div>

                      {formOpen && !isConnected && !isPlanned && i.auth !== 'oauth' && (
                        <div className="mt-3 flex items-center gap-2">
                          <input
                            type="password"
                            value={tokenInput}
                            onChange={(e) => setTokenInput(e.target.value)}
                            placeholder={`${i.name} ${AUTH_HINT[i.auth].toLowerCase()}`}
                            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/50"
                          />
                          <button
                            onClick={() => connectToken(i.id)}
                            disabled={busy === i.id}
                            className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                          >
                            {busy === i.id ? <Loader2 className="size-3.5 animate-spin" /> : 'Save'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
