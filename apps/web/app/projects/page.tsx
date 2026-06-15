'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { PageHeader, Card, ScoreGauge } from '@/components/ui';

export default function ProjectsPage() {
  const { token, hydrated } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});

  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: api.listProjects,
    enabled: Boolean(token),
  });

  const create = useMutation({
    mutationFn: (n: string) => api.createProject(n),
    onSuccess: () => {
      setName('');
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const scan = useMutation({
    mutationFn: (projectId: string) => api.startScan(projectId),
    onSuccess: (res, projectId) => {
      if (typeof res.reliabilityScore === 'number') {
        setScores((s) => ({ ...s, [projectId]: res.reliabilityScore! }));
      }
    },
  });

  if (!hydrated) return null;

  if (!token) {
    return (
      <>
        <PageHeader title="Projects" subtitle="Connected systems under analysis." />
        <Card>
          <p className="text-sm text-muted">
            <Link href="/login" className="text-accent hover:underline">Sign in</Link>{' '}
            to create projects and run live scans against the API.
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Projects" subtitle="Create a project and run a live scan." />

      <Card className="mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate(name.trim());
          }}
          className="flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project name"
            className="flex-1 rounded-md border border-border bg-panel2 px-3 py-2 text-sm text-white outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create'}
          </button>
        </form>
        {create.isError && (
          <p className="mt-2 text-sm text-bad">{(create.error as Error).message}</p>
        )}
      </Card>

      {projects.isLoading && <p className="text-sm text-muted">Loading…</p>}
      {projects.isError && (
        <p className="text-sm text-bad">{(projects.error as Error).message}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {projects.data?.map((p) => (
          <Card key={p.id} title={p.name}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{p.environment}</span>
              <button
                onClick={() => scan.mutate(p.id)}
                disabled={scan.isPending && scan.variables === p.id}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:border-accent disabled:opacity-50"
              >
                {scan.isPending && scan.variables === p.id ? 'Scanning…' : 'Run scan'}
              </button>
            </div>
            {scores[p.id] !== undefined && (
              <div className="mt-4">
                <ScoreGauge score={scores[p.id]} label="reliability" />
              </div>
            )}
          </Card>
        ))}
        {projects.data?.length === 0 && (
          <p className="text-sm text-muted">No projects yet — create one above.</p>
        )}
      </div>
    </>
  );
}
