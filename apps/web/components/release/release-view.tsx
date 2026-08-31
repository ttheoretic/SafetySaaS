'use client'

import Link from 'next/link'
import {
  CircleCheck,
  TriangleAlert,
  OctagonAlert,
  ArrowUpRight,
  ShieldCheck,
  Loader2,
  GitCommitHorizontal,
  ScanLine,
} from 'lucide-react'
import { ScreenHeader, ActionButton } from '@/components/layout/screen-header'
import { SeverityBadge } from '@/components/ui/severity'
import {
  useReleaseReadiness,
  useRiskPosture,
  useChanges,
  useScanMeta,
  useRunScan,
  relativeTime,
} from '@/lib/use-project-data'
import {
  READINESS_LABEL,
  type GateStatus,
  type ReadinessGate,
  type ReadinessItem,
  type ReadinessVerdict,
} from '@riscly/shared'
import { cn } from '@/lib/utils'

const VERDICT: Record<
  ReadinessVerdict,
  { chip: string; edge: string; icon: typeof CircleCheck; text: string }
> = {
  ready: { chip: 'bg-ok text-ok-foreground', edge: 'border-ok/40', icon: CircleCheck, text: 'text-ok' },
  review: { chip: 'bg-medium text-medium-foreground', edge: 'border-medium/40', icon: TriangleAlert, text: 'text-medium' },
  blocked: { chip: 'bg-critical text-critical-foreground', edge: 'border-critical/50', icon: OctagonAlert, text: 'text-critical' },
}

const GATE: Record<GateStatus, { label: string; chip: string; icon: typeof CircleCheck }> = {
  pass: { label: 'PASS', chip: 'bg-ok/15 text-ok border-ok/40', icon: CircleCheck },
  warning: { label: 'WARNING', chip: 'bg-medium/15 text-medium border-medium/40', icon: TriangleAlert },
  fail: { label: 'FAIL', chip: 'bg-critical/15 text-critical border-critical/50', icon: OctagonAlert },
}

/**
 * The release decision layer.
 *
 * Reads the same risk posture and change analysis the rest of the product uses,
 * so "is this shippable?" can never drift from "what is risky?". The verdict is
 * the headline; the gates say which dimension is holding it up; the blockers
 * say exactly what to do about it.
 */
export function ReleaseView() {
  const { readiness, loading } = useReleaseReadiness()
  const { posture } = useRiskPosture()
  const { changes } = useChanges(5)
  const { lastScanLabel } = useScanMeta()
  const { run, isScanning, canScan } = useRunScan()

  const style = VERDICT[readiness.verdict]
  const Icon = style.icon

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Release Readiness"
        subtitle={`Against the analysis from ${lastScanLabel}`}
        actions={
          <ActionButton onClick={run} disabled={!canScan || isScanning}>
            {isScanning ? <Loader2 className="size-3.5 animate-spin" /> : <ScanLine className="size-3.5" />}
            {isScanning ? 'Scanning…' : 'Re-scan'}
          </ActionButton>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 p-5 lg:p-7">
          {/* verdict */}
          <div className={cn('rounded-xl border bg-panel p-5', style.edge)}>
            <div className="flex flex-wrap items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Icon className={cn('size-6', style.text)} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'rounded-[4px] px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider',
                      style.chip,
                    )}
                  >
                    {READINESS_LABEL[readiness.verdict]}
                  </span>
                  <span className="font-mono text-lg font-semibold tabular-nums">
                    {readiness.score}
                    <span className="text-sm text-muted-foreground">/100</span>
                  </span>
                  {posture.score !== null && (
                    <span className="text-xs text-muted-foreground">
                      · risk posture {posture.score}/100
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                  {loading ? 'Evaluating the current state…' : readiness.headline}
                </p>
              </div>
            </div>
          </div>

          {/* gates */}
          {readiness.gates.length > 0 && (
            <section className="rounded-xl border border-border bg-panel">
              <div className="border-b border-border px-5 py-3 text-sm font-medium">
                Gates
              </div>
              <div className="divide-y divide-border/60">
                {readiness.gates.map((g) => (
                  <GateRow key={g.dimension} gate={g} />
                ))}
              </div>
            </section>
          )}

          {/* blockers */}
          <section className="rounded-xl border border-border bg-panel">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="text-sm font-medium">
                Blockers{readiness.blockers.length > 0 ? ` (${readiness.blockers.length})` : ''}
              </span>
              <Link href="/risks" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                All risks <ArrowUpRight className="size-3" />
              </Link>
            </div>
            {readiness.blockers.length === 0 ? (
              <div className="flex items-center gap-2.5 px-5 py-6 text-sm text-muted-foreground">
                <CircleCheck className="size-4 text-ok" />
                Nothing is blocking this release.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {readiness.blockers.map((b) => (
                  <ItemRow key={b.title} item={b} />
                ))}
              </div>
            )}
          </section>

          {/* warnings */}
          {readiness.warnings.length > 0 && (
            <section className="rounded-xl border border-border bg-panel">
              <div className="border-b border-border px-5 py-3 text-sm font-medium">
                Worth a look ({readiness.warnings.length})
              </div>
              <div className="divide-y divide-border/60">
                {readiness.warnings.map((w) => (
                  <ItemRow key={w.title} item={w} />
                ))}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* what shipped since the last release */}
            <section className="flex flex-col rounded-xl border border-border bg-panel">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <span className="text-sm font-medium">Changes in this release</span>
                <Link href="/changes" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  View all <ArrowUpRight className="size-3" />
                </Link>
              </div>
              {changes.length === 0 ? (
                <p className="px-5 py-6 text-xs text-muted-foreground">
                  No analysed changes — connect a repository to judge what is about to ship.
                </p>
              ) : (
                <div className="divide-y divide-border/60">
                  {changes.slice(0, 4).map((c) => (
                    <Link
                      key={`${c.repo}-${c.sha}`}
                      href="/changes"
                      className="flex items-start gap-3 px-5 py-2.5 transition-colors hover:bg-accent/40"
                    >
                      <GitCommitHorizontal className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs">{c.message}</div>
                        <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                          {c.sha} · {relativeTime(c.date)}
                        </div>
                      </div>
                      {c.risk === 'low' ? (
                        <span className="mt-0.5 rounded-[4px] border border-ok/40 bg-ok/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-ok">
                          Safe
                        </span>
                      ) : (
                        <SeverityBadge severity={c.risk} className="mt-0.5" />
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* what was checked */}
            <section className="flex flex-col rounded-xl border border-border bg-panel">
              <div className="border-b border-border px-5 py-3 text-sm font-medium">
                Checks that passed
              </div>
              {readiness.passed.length === 0 ? (
                <p className="px-5 py-6 text-xs text-muted-foreground">
                  Nothing verified yet — run a scan first.
                </p>
              ) : (
                <ul className="flex flex-col gap-2 px-5 py-4">
                  {readiness.passed.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs text-foreground/90">
                      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-ok" />
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function GateRow({ gate }: { gate: ReadinessGate }) {
  const s = GATE[gate.status]
  const Icon = s.icon
  return (
    <div className="flex items-center gap-3 px-5 py-2.5">
      <Icon
        className={cn(
          'size-4 shrink-0',
          gate.status === 'pass' ? 'text-ok' : gate.status === 'warning' ? 'text-medium' : 'text-critical',
        )}
      />
      <span className="w-40 shrink-0 text-sm">{gate.label}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{gate.detail}</span>
      <span
        className={cn(
          'shrink-0 rounded-[4px] border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider',
          s.chip,
        )}
      >
        {s.label}
      </span>
    </div>
  )
}

function ItemRow({ item }: { item: ReadinessItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-accent/40"
    >
      <SeverityBadge severity={item.severity} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{item.title}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
      </div>
      <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
    </Link>
  )
}
