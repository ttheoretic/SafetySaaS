'use client'

import { useMemo } from 'react'
import { ListChecks, WandSparkles, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { ScreenHeader, ActionButton } from '@/components/layout/screen-header'
import { SeverityBadge } from '@/components/ui/severity'
import { useRisks, useRemediationPr } from '@/lib/use-project-data'
import { severityOrder, type Severity } from '@/lib/riscly-data'

// Recommended remediation SLA per severity (industry-typical defaults).
const SLA: Record<Severity, string> = {
  critical: 'within 24h',
  high: 'within 3 days',
  medium: 'within 14 days',
  low: 'within 30 days',
}

export function TriageView() {
  const { risks } = useRisks()
  const remediation = useRemediationPr()

  const queue = useMemo(
    () => [...risks].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]),
    [risks],
  )
  const counts = useMemo(() => {
    const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    risks.forEach((r) => (c[r.severity] += 1))
    return c
  }, [risks])

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Triage Queue"
        subtitle={`${risks.length} open · ${counts.critical} critical · ${counts.high} high`}
        actions={
          <ActionButton
            variant="primary"
            onClick={remediation.open}
            disabled={!remediation.canOpen || remediation.busy}
          >
            {remediation.busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <WandSparkles className="size-3.5" />
            )}
            Open remediation PR
          </ActionButton>
        }
      />

      {risks.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-ok/10 text-ok">
              <ListChecks className="size-5" />
            </div>
            <p className="text-sm font-medium">Nothing to triage</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Run a scan to populate the queue. Findings appear here ranked by severity
              with a recommended remediation SLA.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-4xl">
            <div className="mb-3 flex items-start gap-2.5 rounded-md border border-medium/30 bg-medium/10 px-3 py-2.5">
              <ListChecks className="mt-0.5 size-4 shrink-0 text-medium" />
              <p className="text-xs leading-relaxed text-foreground">
                A severity-ranked worklist of every open finding with its recommended SLA.
                Owner assignment, status, suppressions and ticket sync arrive with the
                workflow layer — for now, fix the top of the queue first.
              </p>
            </div>

            <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
              {queue.map((r) => (
                <div key={r.id} className="flex items-center gap-3 bg-panel px-3 py-2.5">
                  <div className="w-[88px] shrink-0">
                    <SeverityBadge severity={r.severity} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{r.title}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      {r.id} · {r.rule}
                      {r.file ? ` · ${r.file}${r.line ? `:${r.line}` : ''}` : ''}
                    </p>
                  </div>
                  <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:block">
                    SLA {SLA[r.severity]}
                  </span>
                  <Link
                    href="/risks"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    title="Open in Findings"
                  >
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              ))}
            </div>

            {remediation.error && (
              <p className="mt-3 text-[11px] text-destructive">{remediation.error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
