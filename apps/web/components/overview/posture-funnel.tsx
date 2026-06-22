'use client'

import { Panel, PanelHeader } from '@/components/ui/panel'
import { useRisks } from '@/lib/use-project-data'

const STAGES = [
  { key: 'critical', label: 'Critical', tone: 'bg-critical' },
  { key: 'high', label: 'High', tone: 'bg-high' },
  { key: 'medium', label: 'Medium', tone: 'bg-medium' },
  { key: 'low', label: 'Low', tone: 'bg-low' },
] as const

export function PostureFunnel() {
  const { risks, loading } = useRisks()
  const total = risks.length
  const counts = STAGES.reduce(
    (acc, s) => ({ ...acc, [s.key]: risks.filter((r) => r.severity === s.key).length }),
    {} as Record<string, number>,
  )

  return (
    <Panel className="flex-1">
      <PanelHeader title="Risk breakdown by severity" />
      <div className="p-4">
        {total === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {loading ? 'Loading…' : 'No risks yet — run a scan to see the breakdown.'}
          </p>
        ) : (
          <>
            <p className="mb-4 text-xs text-muted-foreground">
              {total} open risk{total === 1 ? '' : 's'} across the latest scan.
            </p>
            <div className="grid grid-cols-4 gap-3">
              {STAGES.map((s) => {
                const value = counts[s.key] ?? 0
                const pct = total > 0 ? Math.round((value / total) * 100) : 0
                return (
                  <div key={s.key} className="flex flex-col gap-2">
                    <span className="text-[11px] text-muted-foreground">{s.label}</span>
                    <span className="font-mono text-2xl font-semibold tabular-nums">
                      {value}
                    </span>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${s.tone}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}
