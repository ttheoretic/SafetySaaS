'use client'

import { useMemo, useState } from 'react'
import {
  Search,
  ListFilter,
  WandSparkles,
  FileCode,
  ChevronRight,
  CircleAlert,
} from 'lucide-react'
import { ScreenHeader, ActionButton } from '@/components/layout/screen-header'
import { SeverityBadge } from '@/components/ui/severity'
import { RiskInspector } from '@/components/shared/risk-inspector'
import { severityOrder, type Severity, type Risk } from '@/lib/riscly-data'
import { useRisks } from '@/lib/use-project-data'
import { cn } from '@/lib/utils'

const filters: { key: Severity | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
]

export function RisksView() {
  const { risks } = useRisks()
  const [filter, setFilter] = useState<Severity | 'all'>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    risks.forEach((r) => (c[r.severity] += 1))
    return c
  }, [risks])

  const filtered = useMemo(() => {
    return risks
      .filter((r) => (filter === 'all' ? true : r.severity === filter))
      .filter((r) =>
        query
          ? (r.title + r.id + r.components.join() + (r.rule ?? ''))
              .toLowerCase()
              .includes(query.toLowerCase())
          : true,
      )
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
  }, [risks, filter, query])

  const selected =
    risks.find((r) => r.id === selectedId) ?? filtered[0] ?? risks[0]

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Risks"
        subtitle={`${risks.length} open · ${counts.critical} critical · ${counts.high} high`}
        actions={
          <ActionButton variant="primary">
            <WandSparkles className="size-3.5" />
            Fix all auto-fixable
          </ActionButton>
        }
      />

      <div className="flex min-h-0 flex-1">
        {/* problems list */}
        <div className="flex min-w-0 flex-1 flex-col border-r border-border">
          {/* toolbar */}
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
            <div className="relative flex flex-1 items-center">
              <Search className="absolute left-2.5 size-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter problems by title, rule, component…"
                className="h-7 w-full rounded-md border border-border bg-background pl-8 pr-2 text-xs outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
              />
            </div>
            <ListFilter className="size-4 text-muted-foreground" />
            <div className="flex items-center gap-1">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    'rounded-sm px-2 py-1 text-[11px] transition-colors',
                    filter === f.key
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {f.label}
                  {f.key !== 'all' && (
                    <span className="ml-1 font-mono text-muted-foreground">
                      {counts[f.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* column headers */}
          <div className="flex h-7 shrink-0 items-center gap-3 border-b border-border bg-panel px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="w-[88px]">Severity</span>
            <span className="flex-1">Problem</span>
            <span className="hidden w-48 md:block">Location</span>
            <span className="w-20">Status</span>
          </div>

          <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
            {filtered.map((r) => (
              <RiskRow
                key={r.id}
                risk={r}
                active={selected?.id === r.id}
                onSelect={() => setSelectedId(r.id)}
              />
            ))}
          </div>
        </div>

        {/* inspector */}
        <div className="hidden w-80 shrink-0 lg:block">
          {selected && <RiskInspector risk={selected} />}
        </div>
      </div>
    </div>
  )
}

function RiskRow({
  risk,
  active,
  onSelect,
}: {
  risk: Risk
  active: boolean
  onSelect: () => void
}) {
  const statusTone = {
    open: 'text-muted-foreground',
    'in-progress': 'text-medium',
    fixed: 'text-ok',
  }
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
        active ? 'bg-accent/60' : 'hover:bg-accent/30',
      )}
    >
      <div className="w-[88px] shrink-0">
        <SeverityBadge severity={risk.severity} />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <CircleAlert
          className={cn(
            'size-3.5 shrink-0',
            risk.severity === 'critical'
              ? 'text-critical'
              : risk.severity === 'high'
                ? 'text-high'
                : risk.severity === 'medium'
                  ? 'text-medium'
                  : 'text-low',
          )}
        />
        <div className="min-w-0">
          <div className="truncate text-sm">{risk.title}</div>
          <div className="truncate font-mono text-[10px] text-muted-foreground">
            {risk.id} · {risk.rule}
          </div>
        </div>
      </div>
      <div className="hidden w-48 shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground md:flex">
        <FileCode className="size-3 shrink-0" />
        <span className="truncate">
          {risk.file}:{risk.line}
        </span>
      </div>
      <div className="flex w-20 shrink-0 items-center justify-between">
        <span className={cn('text-[11px] capitalize', statusTone[risk.status])}>
          {risk.status.replace('-', ' ')}
        </span>
        <ChevronRight className="size-3.5 text-muted-foreground/50" />
      </div>
    </button>
  )
}
