'use client'

import { useMemo } from 'react'
import {
  ShieldAlert,
  CircleAlert,
  WandSparkles,
  Server,
  Boxes,
  CheckCircle2,
} from 'lucide-react'
import {
  useRisks,
  useTriage,
  useActiveProject,
  useSystemGraph,
} from '@/lib/use-project-data'
import { isSuppressed, type TriageStatus } from '@riscly/shared'
import { cn } from '@/lib/utils'

/** Datadog-style KPI tiles across the top of the overview: the numbers a
 *  returning user checks first, all derived from the latest scan. */
export function KpiRow() {
  const { risks: rawRisks } = useRisks()
  const { projectId } = useActiveProject()
  const { statusFor } = useTriage(projectId)
  const { graph } = useSystemGraph()

  const stats = useMemo(() => {
    const withTriage = rawRisks.map((r) => ({
      ...r,
      triage: statusFor(r.fingerprint) as TriageStatus,
    }))
    const open = withTriage.filter((r) => !isSuppressed(r.triage))
    return {
      open: open.length,
      critical: open.filter((r) => r.severity === 'critical').length,
      autoFixable: open.filter((r) => r.file && r.rule).length,
      services: graph?.nodes.length ?? 0,
      vulnDeps: graph?.vulnerabilities?.length ?? 0,
      resolved: withTriage.length - open.length,
    }
  }, [rawRisks, statusFor, graph])

  const tiles = [
    {
      label: 'Open findings',
      value: stats.open,
      icon: ShieldAlert,
      tone: 'text-foreground',
    },
    {
      label: 'Critical',
      value: stats.critical,
      icon: CircleAlert,
      tone: stats.critical > 0 ? 'text-critical' : 'text-ok',
    },
    {
      label: 'Auto-fixable',
      value: stats.autoFixable,
      icon: WandSparkles,
      tone: 'text-primary',
    },
    {
      label: 'Services mapped',
      value: stats.services,
      icon: Server,
      tone: 'text-foreground',
    },
    {
      label: 'Vulnerable deps',
      value: stats.vulnDeps,
      icon: Boxes,
      tone: stats.vulnDeps > 0 ? 'text-high' : 'text-ok',
    },
    {
      label: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle2,
      tone: 'text-ok',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 xl:grid-cols-6">
      {tiles.map((t) => (
        <div key={t.label} className="bg-panel px-3 py-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <t.icon className="size-3" />
            {t.label}
          </div>
          <div className={cn('mt-0.5 font-mono text-lg font-semibold tabular-nums', t.tone)}>
            {t.value}
          </div>
        </div>
      ))}
    </div>
  )
}
