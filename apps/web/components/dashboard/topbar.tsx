'use client';

import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell, Circle, ChevronDown, Database } from 'lucide-react';
import type { SystemGraph } from '@failsafe/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { useDashboardStore } from '@/lib/dashboard-store';

const TITLES: Record<string, string> = {
  '/dashboard': 'Business Health',
  '/risk-center': 'Risk Center',
  '/architecture': 'System Architecture',
  '/projects': 'Projects',
  '/reliability': 'Reliability Score',
  '/simulations': 'Failure Simulations',
  '/predictions': 'AI Failure Prediction',
  '/scenarios': 'Scenario Laboratory',
  '/security': 'Security',
  '/revenue': 'Revenue Risk',
  '/downtime': 'Downtime Cost',
  '/sla': 'SLA Impact',
  '/churn': 'Churn Risk',
  '/reports': 'Reports',
  '/team': 'Team Management',
  '/settings': 'Settings',
  '/login': 'Sign in',
};

function DataSourceSwitcher() {
  const { token } = useAuth();
  const { source, setGraph, reset } = useDashboardStore();
  const projects = useQuery({ queryKey: ['projects'], queryFn: api.listProjects, enabled: Boolean(token) });

  async function pick(value: string) {
    if (value === 'demo') return reset();
    const project = projects.data?.find((p) => p.id === value);
    if (!project) return;
    try {
      const scans = await api.listScans(project.id);
      const latest = scans.find((s) => s.status === 'succeeded' && s.graph);
      if (latest?.graph) setGraph(latest.graph as SystemGraph, project.name);
      else setGraph(useDashboardStore.getState().graph, `${project.name} (run a scan)`);
    } catch {
      /* keep current */
    }
  }

  if (!token || !projects.data?.length) {
    return (
      <span className="hidden items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground sm:flex">
        <Circle className="size-2 fill-primary text-primary" />
        {source} data
      </span>
    );
  }

  return (
    <label className="relative flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground">
      <Database className="size-3.5" />
      <select
        onChange={(e) => pick(e.target.value)}
        defaultValue="demo"
        className="cursor-pointer appearance-none bg-transparent pr-4 text-foreground outline-none"
      >
        <option value="demo">Demo data</option>
        {projects.data.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 size-3.5" />
    </label>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? 'Riscly';
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <h1 className="text-sm font-medium text-foreground">{title}</h1>
      <div className="flex items-center gap-2">
        <DataSourceSwitcher />
        <button className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground">
          <Bell className="size-4" />
        </button>
      </div>
    </header>
  );
}
