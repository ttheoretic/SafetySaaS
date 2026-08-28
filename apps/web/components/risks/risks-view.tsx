'use client'

import { useMemo, useState } from 'react'
import {
  Search,
  FileCode,
  ChevronRight,
  ChevronDown,
  Check,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { ConfidenceBadge } from '@/components/ui/severity'
import { RiskInspector } from '@/components/shared/risk-inspector'
import { severityOrder, type Severity, type Risk } from '@/lib/riscly-data'
import { useRisks, useTriage, useActiveProject } from '@/lib/use-project-data'
import { isSuppressed, TRIAGE_LABEL, type TriageStatus } from '@riscly/shared'
import { cn } from '@/lib/utils'

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low']

const sevDot: Record<Severity, string> = {
  critical: 'bg-critical',
  high: 'bg-high',
  medium: 'bg-medium',
  low: 'bg-low',
}

/** Datadog-style status chip for one risk: open critical/high alert loudly,
 *  medium warns, low is quiet, suppressed shows its triage label. */
function StatusChip({ risk }: { risk: Risk & { triage?: TriageStatus } }) {
  if (risk.triage === 'in_progress') {
    return (
      <span className="rounded-[4px] border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-foreground">
        In progress
      </span>
    )
  }
  if (risk.triage && isSuppressed(risk.triage)) {
    const ok = risk.triage === 'resolved'
    return (
      <span
        className={cn(
          'rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide',
          ok ? 'bg-ok/90 text-ok-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {ok ? 'OK' : TRIAGE_LABEL[risk.triage]}
      </span>
    )
  }
  if (risk.severity === 'critical' || risk.severity === 'high') {
    return (
      <span className="rounded-[4px] border border-critical/50 bg-critical/15 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-critical">
        1 Alert
      </span>
    )
  }
  if (risk.severity === 'medium') {
    return (
      <span className="rounded-[4px] border border-medium/50 bg-medium/15 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-medium">
        1 Warning
      </span>
    )
  }
  return <span className="font-mono text-[11px] text-muted-foreground/50">—</span>
}

/** One facet checkbox row: box, label, count. */
function FacetRow({
  label,
  count,
  checked,
  onToggle,
  dot,
}: {
  label: string
  count: number
  checked: boolean
  onToggle: () => void
  dot?: string
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-foreground/90 transition-colors hover:bg-accent/50"
    >
      <span
        className={cn(
          'flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background',
        )}
      >
        {checked && <Check className="size-2.5" strokeWidth={3} />}
      </span>
      {dot && <span className={cn('size-2 shrink-0 rounded-full', dot)} />}
      <span className="flex-1 truncate capitalize">{label}</span>
      <span className="font-mono text-[11px] text-muted-foreground">{count}</span>
    </button>
  )
}

function FacetGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border/60 py-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs font-semibold text-foreground"
      >
        <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', !open && '-rotate-90')} />
        {title}
      </button>
      {open && <div className="mt-0.5 flex flex-col gap-px">{children}</div>}
    </div>
  )
}

export function RisksView() {
  const { risks: rawRisks } = useRisks()
  const { projectId } = useActiveProject()
  const { statusFor } = useTriage(projectId)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Facet state: empty set = no facet filter applied for that group.
  const [sevFilter, setSevFilter] = useState<Set<Severity>>(new Set())
  const [catFilter, setCatFilter] = useState<Set<string>>(new Set())
  const [fixFilter, setFixFilter] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set())

  const toggle = <T,>(set: Set<T>, value: T, apply: (s: Set<T>) => void) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    apply(next)
  }

  // Attach each finding's persisted triage status.
  const risks = useMemo(
    () => rawRisks.map((r) => ({ ...r, triage: statusFor(r.fingerprint) as TriageStatus })),
    [rawRisks, statusFor],
  )
  const open = useMemo(() => risks.filter((r) => !isSuppressed(r.triage)), [risks])
  const inProgress = useMemo(() => risks.filter((r) => r.triage === 'in_progress'), [risks])
  const resolved = risks.length - open.length

  const sevCounts = useMemo(() => {
    const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    open.forEach((r) => (c[r.severity] += 1))
    return c
  }, [open])

  const catCounts = useMemo(() => {
    const c = new Map<string, number>()
    open.forEach((r) => c.set(r.category, (c.get(r.category) ?? 0) + 1))
    return [...c.entries()].sort((a, b) => b[1] - a[1])
  }, [open])

  const autoFixable = useMemo(() => open.filter((r) => r.file && r.rule), [open])

  // Top auto-fixable rules for the recommendations strip.
  const recommendations = useMemo(() => {
    const seen = new Map<string, Risk>()
    for (const r of autoFixable) {
      const key = r.rule ?? r.title
      if (!seen.has(key)) seen.set(key, r)
      if (seen.size >= 4) break
    }
    return [...seen.values()]
  }, [autoFixable])

  const filtered = useMemo(() => {
    return risks
      .filter((r) => {
        const suppressed = isSuppressed(r.triage)
        if (statusFilter.size === 0) return !suppressed // default: open only
        if (statusFilter.has('open') && !suppressed) return true
        if (statusFilter.has('in_progress') && r.triage === 'in_progress') return true
        if (statusFilter.has('triaged') && suppressed) return true
        return false
      })
      .filter((r) => (sevFilter.size === 0 ? true : sevFilter.has(r.severity)))
      .filter((r) => (catFilter.size === 0 ? true : catFilter.has(r.category)))
      .filter((r) => {
        if (fixFilter.size === 0) return true
        const auto = Boolean(r.file && r.rule)
        return (fixFilter.has('auto') && auto) || (fixFilter.has('manual') && !auto)
      })
      .filter((r) =>
        query
          ? (r.title + r.id + r.components.join() + (r.rule ?? '') + (r.file ?? ''))
              .toLowerCase()
              .includes(query.toLowerCase())
          : true,
      )
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
  }, [risks, sevFilter, catFilter, fixFilter, statusFilter, query])

  const selected =
    risks.find((r) => r.id === selectedId) ?? filtered[0] ?? risks[0]

  const alerts = sevCounts.critical + sevCounts.high

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Risk Center"
        subtitle={`${open.length} open · ${sevCounts.critical} critical · ${sevCounts.high} high`}
      />

      {/* summary chips (monitor-style) */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-1.5">
          <span className="text-xs font-medium">Critical</span>
          <span className={cn(
            'rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase',
            sevCounts.critical > 0 ? 'bg-critical text-critical-foreground' : 'bg-muted text-muted-foreground',
          )}>
            {sevCounts.critical} Alert
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-1.5">
          <span className="text-xs font-medium">High</span>
          <span className={cn(
            'rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase',
            sevCounts.high > 0 ? 'bg-high text-high-foreground' : 'bg-muted text-muted-foreground',
          )}>
            {sevCounts.high} Warning
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-1.5">
          <span className="text-xs font-medium">Resolved</span>
          <span className={cn(
            'rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase',
            resolved > 0 ? 'bg-ok text-ok-foreground' : 'bg-muted text-muted-foreground',
          )}>
            {resolved} OK
          </span>
        </div>
        <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground sm:block">
          Showing {filtered.length} of {risks.length} risks
        </span>
      </div>

      {/* recommendations strip — top auto-fixable rules */}
      {recommendations.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-dashed border-primary/40 px-3 py-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-bold text-primary-foreground">
            {autoFixable.length}
          </span>
          <span className="shrink-0 text-xs font-semibold text-primary">Auto-fixable</span>
          <span className="shrink-0 text-xs text-muted-foreground">·</span>
          {recommendations.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-panel px-2.5 py-1 text-xs text-foreground/90 transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <WandSparkles className="size-3 text-primary" />
              <span className="max-w-56 truncate">{r.title}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* facet rail */}
        <div className="hidden w-52 shrink-0 flex-col overflow-y-auto border-r border-border bg-panel/40 px-1.5 py-2 md:flex">
          <div className="relative mx-1 mb-1 flex items-center">
            <Search className="absolute left-2 size-3 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search facets"
              className="h-7 w-full rounded-md border border-border bg-background pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
            />
          </div>

          <FacetGroup title="Severity">
            {SEVERITIES.map((s) => (
              <FacetRow
                key={s}
                label={s}
                dot={sevDot[s]}
                count={sevCounts[s]}
                checked={sevFilter.size === 0 || sevFilter.has(s)}
                onToggle={() => toggle(sevFilter, s, setSevFilter)}
              />
            ))}
          </FacetGroup>

          <FacetGroup title="Category">
            {catCounts.map(([cat, n]) => (
              <FacetRow
                key={cat}
                label={cat}
                count={n}
                checked={catFilter.size === 0 || catFilter.has(cat)}
                onToggle={() => toggle(catFilter, cat, setCatFilter)}
              />
            ))}
          </FacetGroup>

          <FacetGroup title="Fix availability">
            <FacetRow
              label="Auto-fixable"
              count={autoFixable.length}
              checked={fixFilter.size === 0 || fixFilter.has('auto')}
              onToggle={() => toggle(fixFilter, 'auto', setFixFilter)}
            />
            <FacetRow
              label="Manual"
              count={open.length - autoFixable.length}
              checked={fixFilter.size === 0 || fixFilter.has('manual')}
              onToggle={() => toggle(fixFilter, 'manual', setFixFilter)}
            />
          </FacetGroup>

          <FacetGroup title="Status">
            <FacetRow
              label="Open"
              count={open.length}
              checked={statusFilter.size === 0 || statusFilter.has('open')}
              onToggle={() => toggle(statusFilter, 'open', setStatusFilter)}
            />
            <FacetRow
              label="In progress"
              count={inProgress.length}
              checked={statusFilter.has('in_progress')}
              onToggle={() => toggle(statusFilter, 'in_progress', setStatusFilter)}
            />
            <FacetRow
              label="Triaged"
              count={resolved}
              checked={statusFilter.has('triaged')}
              onToggle={() => toggle(statusFilter, 'triaged', setStatusFilter)}
            />
          </FacetGroup>
        </div>

        {/* risks table */}
        <div className="flex min-w-0 flex-1 flex-col border-r border-border">
          <div className="flex h-8 shrink-0 items-center gap-3 border-b border-border bg-panel px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="flex-1">Risk / Service</span>
            <span className="w-24">Status</span>
            <span className="hidden w-20 lg:block">Fix</span>
            <span className="hidden w-44 xl:block">Location</span>
          </div>

          <div className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-10 text-center text-xs text-muted-foreground">
                {risks.length === 0
                  ? 'No risks found. Connect a repository and run a scan.'
                  : 'No risks match this filter.'}
              </p>
            ) : (
              filtered.map((r) => (
                <RiskRow
                  key={r.id}
                  risk={r}
                  active={selected?.id === r.id}
                  onSelect={() => setSelectedId(r.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* inspector */}
        <div className="hidden w-[28rem] shrink-0 lg:block">
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
  risk: Risk & { triage?: TriageStatus }
  active: boolean
  onSelect: () => void
}) {
  const auto = Boolean(risk.file && risk.rule)
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
        active ? 'bg-accent/60' : 'hover:bg-accent/30',
      )}
    >
      {/* risk / service — two-line, Datadog style */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 shrink-0 rounded-full', sevDot[risk.severity])} />
          <span className="truncate text-sm font-medium">{risk.title}</span>
          <ConfidenceBadge confidence={risk.confidence} />
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 pl-4 font-mono text-[10px] text-muted-foreground">
          <span>{risk.id}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="truncate">{risk.rule}</span>
          {risk.components.length > 0 && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="truncate">{risk.components.join(', ')}</span>
            </>
          )}
        </div>
      </div>

      <div className="w-24 shrink-0">
        <StatusChip risk={risk} />
      </div>

      <div className="hidden w-20 shrink-0 lg:block">
        {auto ? (
          <span className="inline-flex items-center gap-1 rounded-[4px] border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-primary">
            <Sparkles className="size-2.5" /> Auto
          </span>
        ) : (
          <span className="font-mono text-[11px] text-muted-foreground/50">—</span>
        )}
      </div>

      <div className="hidden w-44 shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground xl:flex">
        {risk.file ? (
          <>
            <FileCode className="size-3 shrink-0" />
            <span className="truncate">
              {risk.file}
              {risk.line ? `:${risk.line}` : ''}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </div>

      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
    </button>
  )
}
