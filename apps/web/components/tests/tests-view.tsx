'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CircleCheck,
  CircleHelp,
  OctagonAlert,
  Loader2,
  PlayCircle,
  FileCode,
  History,
  ArrowUpRight,
} from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { SeverityBadge } from '@/components/ui/severity'
import { useValidation, relativeTime } from '@/lib/use-project-data'
import {
  CHECK_KIND_LABEL,
  OUTCOME_LABEL,
  summarize,
  type CheckOutcome,
  type ValidationCheck,
} from '@riscly/shared'
import type { ValidationRunResponse } from '@/lib/api'
import { cn } from '@/lib/utils'

const OUTCOME: Record<
  CheckOutcome,
  { icon: typeof CircleCheck; text: string; chip: string }
> = {
  confirmed: {
    icon: OctagonAlert,
    text: 'text-critical',
    chip: 'bg-critical/15 text-critical border-critical/40',
  },
  resolved: {
    icon: CircleCheck,
    text: 'text-ok',
    chip: 'bg-ok/15 text-ok border-ok/40',
  },
  inconclusive: {
    icon: CircleHelp,
    text: 'text-muted-foreground',
    chip: 'bg-muted text-muted-foreground border-border',
  },
}

/**
 * Validation.
 *
 * A scan says "this looks wrong"; a run here goes back to the source and asks
 * "is it still wrong, right now?". Confirmed findings get full weight in the
 * risk posture, resolved ones stop counting, and anything we could not reach is
 * reported as inconclusive rather than quietly passing.
 */
export function TestsView() {
  const { runs, latest, loading, error, start, isRunning, canRun } = useValidation()
  const [openRunId, setOpenRunId] = useState<string | null>(null)

  const shown: ValidationRunResponse | null =
    runs.find((r) => r.id === openRunId) ?? latest
  const summary = shown ? summarize(shown.checks) : null

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Tests"
        subtitle="Re-test open findings against the live sources"
        actions={
          <button
            onClick={start}
            disabled={!canRun || isRunning}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isRunning ? <Loader2 className="size-3.5 animate-spin" /> : <PlayCircle className="size-3.5" />}
            {isRunning ? 'Running…' : 'Run validation'}
          </button>
        }
      />

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto">
          {loading ? (
            <Empty icon={<Loader2 className="size-5 animate-spin" />} title="Loading runs" body="" />
          ) : error ? (
            <Empty
              icon={<OctagonAlert className="size-5 text-critical" />}
              title="Could not load validation runs"
              body={error.message}
            />
          ) : !shown ? (
            <Empty
              icon={<PlayCircle className="size-5" />}
              title="No validation run yet"
              body="A run re-reads the flagged locations and re-tests detected credentials against their provider, so you know which findings are still real."
            />
          ) : (
            <>
              {/* summary of the shown run */}
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
                <Chip label="Confirmed" value={summary!.confirmed} tone="critical" />
                <Chip label="Resolved" value={summary!.resolved} tone="ok" />
                <Chip label="Inconclusive" value={summary!.inconclusive} tone="muted" />
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                  {Math.round(summary!.coverage * 100)}% conclusive · {relativeTime(shown.startedAt)}
                </span>
              </div>

              {shown.checks.length === 0 ? (
                <Empty
                  icon={<CircleCheck className="size-5 text-ok" />}
                  title="Nothing left to re-test"
                  body="None of your open findings has evidence that can be independently re-checked right now."
                />
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="w-32 px-3 py-2 font-medium">Result</th>
                      <th className="px-3 py-2 font-medium">Finding</th>
                      <th className="hidden w-48 px-3 py-2 font-medium lg:table-cell">Check</th>
                      <th className="w-20 px-3 py-2 font-medium">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.checks.map((c, i) => (
                      <CheckRow key={`${c.fingerprint}-${i}`} check={c} />
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>

        {/* history — lives here rather than as a page of its own */}
        <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-border bg-panel lg:flex">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <History className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              History
            </span>
          </div>
          {runs.length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground">
              Runs appear here once you validate.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {runs.map((r) => {
                const s = summarize(r.checks)
                const active = shown?.id === r.id
                return (
                  <button
                    key={r.id}
                    onClick={() => setOpenRunId(r.id)}
                    className={cn(
                      'flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-accent/40',
                      active && 'bg-accent/60',
                    )}
                  >
                    <span className="text-xs font-medium">{relativeTime(r.startedAt)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {s.confirmed} confirmed · {s.resolved} resolved · {s.inconclusive} unknown
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          <div className="mt-auto border-t border-border p-4">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Advisory and configuration findings are re-established by a full scan —{' '}
              <Link href="/dashboard" className="underline underline-offset-2 hover:text-foreground">
                run one
              </Link>{' '}
              to re-check those.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function CheckRow({ check }: { check: ValidationCheck }) {
  const o = OUTCOME[check.outcome]
  const Icon = o.icon
  return (
    <tr className="border-b border-border/60 align-top">
      <td className="px-3 py-2.5">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[4px] border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide',
            o.chip,
          )}
        >
          <Icon className="size-3" />
          {OUTCOME_LABEL[check.outcome]}
        </span>
      </td>
      <td className="min-w-0 px-3 py-2.5">
        <div className="truncate font-medium text-foreground">{check.title}</div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          {check.detail}
        </div>
        {check.file && (
          <div className="mt-1 flex items-center gap-1.5 truncate font-mono text-[10px] text-muted-foreground/80">
            <FileCode className="size-3 shrink-0" />
            {check.file}
            {check.line ? `:${check.line}` : ''}
          </div>
        )}
      </td>
      <td className="hidden px-3 py-2.5 lg:table-cell">
        <span className="text-[11px] text-muted-foreground">{CHECK_KIND_LABEL[check.kind]}</span>
      </td>
      <td className="px-3 py-2.5">
        <SeverityBadge severity={check.severity} />
      </td>
    </tr>
  )
}

function Chip({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'critical' | 'ok' | 'muted'
}) {
  const filled =
    tone === 'critical'
      ? 'bg-critical text-critical-foreground'
      : tone === 'ok'
        ? 'bg-ok text-ok-foreground'
        : 'bg-muted text-muted-foreground'
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-1.5">
      <span className="text-xs font-medium">{label}</span>
      <span
        className={cn(
          'rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums',
          value > 0 ? filled : 'bg-muted text-muted-foreground',
        )}
      >
        {value}
      </span>
    </div>
  )
}

function Empty({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}
