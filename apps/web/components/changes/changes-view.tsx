'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  GitCommitHorizontal,
  ExternalLink,
  FileCode,
  Package,
  Network,
  ShieldAlert,
  Loader2,
  GitBranch,
  CircleCheck,
  ArrowRight,
} from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { SeverityBadge } from '@/components/ui/severity'
import { useChanges, useSystemGraph, relativeTime } from '@/lib/use-project-data'
import type { ChangeAnalysis, ChangeImpactKind } from '@riscly/shared'
import { cn } from '@/lib/utils'

/** Icon per impact dimension, so signals are scannable without reading. */
const KIND_ICON: Record<ChangeImpactKind, typeof ShieldAlert> = {
  security: ShieldAlert,
  architecture: Network,
  reliability: GitBranch,
  dependency: Package,
  business: ArrowRight,
}

const KIND_LABEL: Record<ChangeImpactKind, string> = {
  security: 'Security',
  architecture: 'Architecture',
  reliability: 'Reliability',
  dependency: 'Dependencies',
  business: 'Business',
}

/** Loud for risky changes, quiet for routine ones — same language as Risks. */
function RiskChip({ risk }: { risk: ChangeAnalysis['risk'] }) {
  if (risk === 'low') {
    return (
      <span className="rounded-[4px] border border-ok/40 bg-ok/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ok">
        Safe
      </span>
    )
  }
  return <SeverityBadge severity={risk} />
}

export function ChangesView() {
  const { changes, scannedAt, loading, error } = useChanges(12)
  const { graph } = useSystemGraph()
  const [selectedSha, setSelectedSha] = useState<string | null>(null)

  // Resolve the engine's node ids to the names shown in the architecture map.
  const nodeName = useMemo(() => {
    const m = new Map<string, string>()
    for (const n of graph?.nodes ?? []) m.set(n.id, n.name)
    return m
  }, [graph])

  const counts = useMemo(
    () => ({
      critical: changes.filter((c) => c.risk === 'critical').length,
      high: changes.filter((c) => c.risk === 'high').length,
      safe: changes.filter((c) => c.risk === 'low').length,
    }),
    [changes],
  )

  const selected =
    changes.find((c) => c.sha === selectedSha) ?? changes[0] ?? null

  const scannedTs = scannedAt ? new Date(scannedAt).getTime() : null
  const isUnscanned = (c: ChangeAnalysis) =>
    scannedTs !== null && new Date(c.date).getTime() > scannedTs

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Change Intelligence"
        subtitle={
          loading
            ? 'Analysing recent commits…'
            : `${changes.length} recent ${changes.length === 1 ? 'change' : 'changes'} analysed against your architecture`
        }
      />

      {/* summary chips */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        <SummaryChip label="Needs review" value={counts.critical} tone="critical" suffix="Alert" />
        <SummaryChip label="Sensitive" value={counts.high} tone="high" suffix="Warning" />
        <SummaryChip label="Safe" value={counts.safe} tone="ok" suffix="OK" />
        {scannedAt && (
          <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground sm:block">
            Compared against the scan from {relativeTime(scannedAt)}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* change list */}
        <div className="min-w-0 flex-1 overflow-y-auto">
          {loading ? (
            <EmptyState
              icon={<Loader2 className="size-5 animate-spin" />}
              title="Reading your commit history"
              body="Each commit is compared against the architecture from your latest scan."
            />
          ) : error ? (
            <EmptyState
              icon={<ShieldAlert className="size-5 text-critical" />}
              title="Could not load changes"
              body={error.message}
            />
          ) : changes.length === 0 ? (
            <EmptyState
              icon={<GitCommitHorizontal className="size-5" />}
              title="No changes to analyse yet"
              body="Connect a GitHub repository and Riscly will judge every commit against the architecture it mapped."
              action={
                <Link
                  href="/settings?tab=repositories"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Connect a repository
                </Link>
              }
            />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="w-24 px-3 py-2 font-medium">Impact</th>
                  <th className="px-3 py-2 font-medium">Change</th>
                  <th className="hidden w-44 px-3 py-2 font-medium lg:table-cell">Affects</th>
                  <th className="w-28 px-3 py-2 text-right font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((c) => (
                  <tr
                    key={`${c.repo}-${c.sha}`}
                    onClick={() => setSelectedSha(c.sha)}
                    className={cn(
                      'cursor-pointer border-b border-border/60 align-top transition-colors hover:bg-accent/40',
                      selected?.sha === c.sha && 'bg-accent/60',
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <RiskChip risk={c.risk} />
                    </td>
                    <td className="min-w-0 px-3 py-2.5">
                      <div className="truncate font-medium text-foreground">{c.message}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-muted-foreground">
                        <span>{c.sha}</span>
                        <span>·</span>
                        <span className="truncate">{c.repo}</span>
                        <span>·</span>
                        <span>{c.author}</span>
                        <span>·</span>
                        <span>
                          {c.filesChanged} {c.filesChanged === 1 ? 'file' : 'files'}
                        </span>
                        {isUnscanned(c) && (
                          <span className="rounded-sm bg-muted px-1 text-[9px] uppercase tracking-wide text-muted-foreground">
                            not yet scanned
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-3 py-2.5 lg:table-cell">
                      <KindChips change={c} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[11px] text-muted-foreground">
                      {relativeTime(c.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* inspector */}
        {selected && (
          <aside className="hidden w-[28rem] shrink-0 flex-col overflow-y-auto border-l border-border bg-panel xl:flex">
            <ChangeInspector change={selected} nodeName={nodeName} />
          </aside>
        )}
      </div>
    </div>
  )
}

/** The distinct dimensions a change touches — one chip per dimension. */
function KindChips({ change }: { change: ChangeAnalysis }) {
  const kinds = [...new Set(change.signals.map((s) => s.kind))]
  if (kinds.length === 0) {
    return <span className="font-mono text-[11px] text-muted-foreground/50">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {kinds.slice(0, 2).map((k) => (
        <span
          key={k}
          className="rounded-sm border border-border bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
        >
          {KIND_LABEL[k]}
        </span>
      ))}
      {kinds.length > 2 && (
        <span className="text-[10px] text-muted-foreground">+{kinds.length - 2}</span>
      )}
    </div>
  )
}

function SummaryChip({
  label,
  value,
  tone,
  suffix,
}: {
  label: string
  value: number
  tone: 'critical' | 'high' | 'ok'
  suffix: string
}) {
  const filled =
    tone === 'critical'
      ? 'bg-critical text-critical-foreground'
      : tone === 'high'
        ? 'bg-high text-high-foreground'
        : 'bg-ok text-ok-foreground'
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-1.5">
      <span className="text-xs font-medium">{label}</span>
      <span
        className={cn(
          'rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase',
          value > 0 ? filled : 'bg-muted text-muted-foreground',
        )}
      >
        {value} {suffix}
      </span>
    </div>
  )
}

/** The full verdict for one change: what it means, why, and what it touches. */
function ChangeInspector({
  change,
  nodeName,
}: {
  change: ChangeAnalysis
  nodeName: Map<string, string>
}) {
  const edge =
    change.risk === 'critical'
      ? 'bg-critical'
      : change.risk === 'high'
        ? 'bg-high'
        : change.risk === 'medium'
          ? 'bg-medium'
          : 'bg-ok'

  return (
    <div className="flex flex-col">
      <div className={cn('h-[3px] shrink-0', edge)} />

      <div className="border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-snug">{change.message}</h2>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {change.repo} · {change.sha} · {change.author} · {relativeTime(change.date)}
            </p>
          </div>
          <RiskChip risk={change.risk} />
        </div>

        <p className="mt-3 text-xs leading-relaxed text-foreground/90">{change.summary}</p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Files" value={String(change.filesChanged)} />
          <Stat label="Added" value={`+${change.additions.toLocaleString('en-US')}`} />
          <Stat label="Removed" value={`−${change.deletions.toLocaleString('en-US')}`} />
        </div>

        {change.url && (
          <a
            href={change.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
            View the diff on GitHub
          </a>
        )}
      </div>

      {/* affected architecture */}
      {change.touchedNodes.length > 0 && (
        <Section title="Affects these components">
          <div className="flex flex-wrap gap-1.5">
            {change.touchedNodes.map((id) => (
              <Link
                key={id}
                href={`/architecture?node=${encodeURIComponent(id)}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2 py-1 text-xs transition-colors hover:border-muted-foreground/40"
              >
                <Network className="size-3 text-muted-foreground" />
                {nodeName.get(id) ?? id}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* new dependencies */}
      {change.newDependencies.length > 0 && (
        <Section title="New dependencies">
          <div className="flex flex-wrap gap-1.5">
            {change.newDependencies.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2 py-1 font-mono text-[11px]"
              >
                <Package className="size-3 text-muted-foreground" />
                {d}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Each one is third-party code you now ship. The next scan checks them against the
            advisory database —{' '}
            <Link href="/dependencies" className="underline underline-offset-2 hover:text-foreground">
              see dependency risks
            </Link>
            .
          </p>
        </Section>
      )}

      {/* signals */}
      <Section title={`Why this matters (${change.signals.length})`}>
        {change.signals.length === 0 ? (
          <div className="flex items-start gap-2 rounded-md border border-ok/30 bg-ok/5 p-3">
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-ok" />
            <p className="text-xs leading-relaxed text-foreground/90">
              Nothing in this change touches security, the architecture or the revenue path.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {change.signals.map((s) => {
              const Icon = KIND_ICON[s.kind]
              return (
                <div key={s.title} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold">{s.title}</h4>
                        <SeverityBadge severity={s.severity} />
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {s.detail}
                      </p>
                      {s.files.length > 0 && (
                        <ul className="mt-2 flex flex-col gap-0.5">
                          {s.files.map((f) => (
                            <li
                              key={f}
                              className="flex items-center gap-1.5 truncate font-mono text-[10px] text-muted-foreground/80"
                            >
                              <FileCode className="size-3 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border p-4">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm">{value}</div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
