import Link from 'next/link'
import {
  ShieldAlert,
  Activity,
  Gauge,
  Boxes,
  ArrowUpRight,
  GitCommitHorizontal,
} from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { SeverityBadge } from '@/components/ui/severity'
import {
  healthMetrics,
  recentChanges,
  risks,
  type HealthStatus,
} from '@/lib/riscly-data'
import { cn } from '@/lib/utils'

const statusTone: Record<HealthStatus, string> = {
  ok: 'text-ok',
  warn: 'text-medium',
  critical: 'text-critical',
}
const statusBg: Record<HealthStatus, string> = {
  ok: 'bg-ok',
  warn: 'bg-medium',
  critical: 'bg-critical',
}

const icons = [ShieldAlert, Activity, Gauge, Boxes]

export function HealthGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {healthMetrics.map((m, i) => {
        const Icon = icons[i]
        return (
          <Panel key={m.label} className="p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="size-3.5" />
                {m.label}
              </span>
              <span className={cn('size-2 rounded-full', statusBg[m.status])} />
            </div>
            <div className={cn('mt-2 font-mono text-lg font-semibold', statusTone[m.status])}>
              {m.value}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{m.detail}</div>
          </Panel>
        )
      })}
    </div>
  )
}

export function CriticalRisksPanel() {
  const top = [...risks]
    .filter((r) => r.severity === 'critical' || r.severity === 'high')
    .slice(0, 5)
  return (
    <Panel className="flex-1">
      <PanelHeader
        title="Top risks"
        icon={<ShieldAlert className="size-3.5 text-critical" />}
        action={
          <Link
            href="/risks"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View all <ArrowUpRight className="size-3" />
          </Link>
        }
      />
      <div className="divide-y divide-border">
        {top.map((r) => (
          <Link
            key={r.id}
            href="/risks"
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/40"
          >
            <SeverityBadge severity={r.severity} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{r.title}</div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">
                {r.id} · {r.components.join(', ')}
              </div>
            </div>
            {r.exploitAvailable && (
              <span className="rounded-sm bg-critical/15 px-1.5 py-0.5 font-mono text-[10px] text-critical">
                exploit
              </span>
            )}
          </Link>
        ))}
      </div>
    </Panel>
  )
}

const changeTone = {
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium',
  low: 'text-muted-foreground',
}

export function RecentChangesPanel() {
  return (
    <Panel className="flex-1">
      <PanelHeader
        title="Recent risky changes"
        icon={<GitCommitHorizontal className="size-3.5 text-muted-foreground" />}
      />
      <div className="divide-y divide-border">
        {recentChanges.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className="flex size-6 items-center justify-center rounded-full bg-secondary font-mono text-[10px]">
              {c.author.slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{c.message}</div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {c.repo} · {c.time}
              </div>
            </div>
            <span className={cn('font-mono text-[11px]', changeTone[c.risk])}>
              {c.delta}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}
