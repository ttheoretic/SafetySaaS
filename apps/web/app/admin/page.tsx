'use client'

import { useQuery } from '@tanstack/react-query'
import {
  DollarSign, TrendingUp, Users, Beaker, Boxes, GitBranch, Cloud,
  ShieldCheck, AlertTriangle, Activity,
} from 'lucide-react'
import { api } from '@/lib/api'
import {
  Kpi, KpiSkeletonGrid, Panel, SectionTitle, LineChart, BarChart, Empty, usd, relTime,
} from '@/components/admin/ui'

export default function AdminOverview() {
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api.admin.overview() })
  const activity = useQuery({ queryKey: ['admin', 'activity'], queryFn: () => api.admin.activity() })

  const k = overview.data?.kpis
  const c = overview.data?.charts

  return (
    <div className="space-y-6">
      <SectionTitle title="Overview" sub="Business at a glance — revenue, growth, usage and posture." />

      {overview.isLoading || !k ? (
        <KpiSkeletonGrid count={10} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
          <Kpi label="MRR" value={usd(k.mrr)} icon={<DollarSign className="size-4" />} accent hint="Monthly recurring" />
          <Kpi label="ARR" value={usd(k.arr)} icon={<TrendingUp className="size-4" />} hint="Annual run-rate" />
          <Kpi label="Active customers" value={k.activeCustomers} icon={<Users className="size-4" />} />
          <Kpi label="Trial users" value={k.trialUsers} icon={<Beaker className="size-4" />} />
          <Kpi label="Active workspaces" value={k.activeWorkspaces} icon={<Boxes className="size-4" />} />
          <Kpi label="GitHub accounts" value={k.totalGithubAccounts} icon={<GitBranch className="size-4" />} />
          <Kpi label="Cloud providers" value={k.connectedCloudProviders} icon={<Cloud className="size-4" />} />
          <Kpi label="Avg reliability" value={k.avgReliabilityScore || '—'} icon={<ShieldCheck className="size-4" />} hint="across scanned projects" />
          <Kpi label="Avg risks / workspace" value={k.avgRisksPerWorkspace || '—'} icon={<AlertTriangle className="size-4" />} />
          <Kpi label="Avg revenue at risk" value={k.avgRevenueAtRisk ? usd(k.avgRevenueAtRisk) : '—'} icon={<DollarSign className="size-4" />} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Daily signups">
          {c ? <LineChart data={c.signups} /> : <Empty label="Loading…" />}
        </Panel>
        <Panel title="Scans / day">
          {c ? <LineChart data={c.scans} color="var(--ok)" /> : <Empty label="Loading…" />}
        </Panel>
        <Panel title="New workspaces / day">
          {c ? <LineChart data={c.newWorkspaces} color="var(--high)" /> : <Empty label="Loading…" />}
        </Panel>
        <Panel title="Plan distribution">
          {c ? <BarChart data={c.planDistribution.map((p) => ({ label: p.plan, value: p.count }))} /> : <Empty label="Loading…" />}
        </Panel>
      </div>

      <Panel title="Recent activity">
        {activity.isLoading ? (
          <Empty label="Loading…" />
        ) : !activity.data?.length ? (
          <Empty label="No activity yet" />
        ) : (
          <ul className="divide-y divide-border">
            {activity.data.map((a, i) => (
              <li key={i} className="flex items-center gap-3 py-2 text-sm">
                <Activity className="size-3.5 shrink-0 text-primary" />
                <span className="font-medium">{a.label}</span>
                {a.workspace && <span className="text-muted-foreground">· {a.workspace}</span>}
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">{relTime(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
