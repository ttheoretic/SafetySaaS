'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Bell, ChevronsUpDown, CircleDot, Command, Loader2, ScanLine,
} from 'lucide-react';
import { exampleBusiness, type BusinessContext, type SystemGraph } from '@riscly/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { usePlan } from '@/lib/use-plan';
import { useDashboardStore } from '@/lib/dashboard-store';
import { cn } from '@/lib/utils';

/** Workspace + data-source breadcrumb, search, and a working Run Scan action. */
export function Topbar() {
  const router = useRouter();
  const qc = useQueryClient();
  const { token } = useAuth();
  const { plan } = usePlan();
  const { source, setGraph, setBusiness, reset } = useDashboardStore();
  const [sourceOpen, setSourceOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const me = useQuery({ queryKey: ['me'], queryFn: api.me, enabled: Boolean(token) });
  const projects = useQuery({ queryKey: ['projects'], queryFn: api.listProjects, enabled: Boolean(token) });
  const firstId = projects.data?.[0]?.id;

  const workspace = me.data?.activeOrg.name ?? 'Riscly';

  /** Load a project's saved business context (falls back to demo numbers). */
  async function loadBusiness(projectId: string) {
    try {
      const biz = await api.getBusiness(projectId);
      setBusiness(biz ? ({ ...exampleBusiness, ...biz } as BusinessContext) : exampleBusiness);
    } catch { /* keep current */ }
  }

  async function pickSource(value: string) {
    setSourceOpen(false);
    if (value === 'demo') {
      reset();
      setBusiness(exampleBusiness);
      return;
    }
    const project = projects.data?.find((p) => p.id === value);
    if (!project) return;
    try {
      const scans = await api.listScans(project.id);
      const latest = scans.find((s) => s.status === 'succeeded' && s.graph);
      if (latest?.graph) setGraph(latest.graph as SystemGraph, project.name);
      else setGraph(useDashboardStore.getState().graph, `${project.name} (run a scan)`);
      await loadBusiness(project.id);
    } catch { /* keep current */ }
  }

  // Show the user's real data by default: once their projects load, auto-select
  // the first one instead of leaving the dashboard on the demo source. Runs once
  // and only while still on 'Demo', so it never overrides a manual choice.
  const autoLoaded = useRef(false);
  useEffect(() => {
    if (autoLoaded.current) return;
    const list = projects.data;
    if (!list || list.length === 0) return;
    if (useDashboardStore.getState().source !== 'Demo') return;
    autoLoaded.current = true;
    void pickSource(list[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.data]);

  async function runScan() {
    if (!token) return router.push('/login');
    if (!firstId) return router.push('/get-started');
    setRunning(true);
    try {
      await api.startScan(firstId);
      const scans = await api.listScans(firstId);
      const latest = scans.find((s) => s.status === 'succeeded' && s.graph);
      if (latest?.graph) setGraph(latest.graph as SystemGraph, projects.data?.[0]?.name ?? source);
      qc.invalidateQueries({ queryKey: ['billing'] });
      qc.invalidateQueries({ queryKey: ['scans'] });
    } catch { /* ignore */ } finally {
      setRunning(false);
    }
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      {/* Workspace + data source breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="flex items-center gap-1.5 rounded-md px-2 py-1">
          <span className="font-medium text-foreground">{workspace}</span>
          <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            {plan}
          </span>
        </span>
        <span className="text-border">/</span>
        <div className="relative">
          <button
            onClick={() => setSourceOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <span className="font-medium text-foreground">{source}</span>
            <span className="flex items-center gap-1 rounded border border-risk-ok/30 bg-risk-ok/10 px-1.5 py-0.5 text-[10px] font-medium text-risk-ok">
              <CircleDot className="size-2.5" /> LIVE
            </span>
            <ChevronsUpDown className="size-3" />
          </button>
          {sourceOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-44 rounded-lg border border-border bg-popover p-1 shadow-xl">
              <button
                onClick={() => pickSource('demo')}
                className="block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-foreground hover:bg-accent"
              >
                Demo data
              </button>
              {projects.data?.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pickSource(p.id)}
                  className="block w-full truncate rounded-md px-2.5 py-1.5 text-left text-[13px] text-foreground hover:bg-accent"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="ml-2 hidden flex-1 items-center lg:flex">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search risks, services, scenarios..."
            className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-12 text-[13px] outline-none placeholder:text-muted-foreground focus:border-ring/60"
          />
          <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-elevated px-1.5 py-0.5 text-[10px] text-muted-foreground">
            <Command className="size-2.5" />K
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-1.5">
        <button className="hidden rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground sm:block">
          Feedback
        </button>
        <button className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-risk-critical" />
        </button>
        <button
          onClick={runScan}
          disabled={running}
          className={cn(
            'flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60',
          )}
        >
          {running ? <Loader2 className="size-3.5 animate-spin" /> : <ScanLine className="size-3.5" />}
          Run Scan
        </button>
      </div>
    </header>
  );
}
