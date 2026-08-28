'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ScanLine,
  FlaskConical,
  Loader2,
  WandSparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  FileDown,
  FileCode,
  GitCommitHorizontal,
  Network,
  ShieldCheck,
  OctagonAlert,
  TriangleAlert,
  CircleCheck,
  Bot,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import {
  useActiveProject,
  useRunScan,
  useScanMeta,
  useRisks,
  useTriage,
  useSystemGraph,
  useScanHistory,
  useReleaseReadiness,
  useRiskScores,
  useChanges,
  relativeTime,
} from '@/lib/use-project-data'
import {
  isSuppressed,
  READINESS_LABEL,
  type ReadinessResult,
  type ReadinessVerdict,
  type TriageStatus,
} from '@riscly/shared'
import { SeverityBadge } from '@/components/ui/severity'
import { cn } from '@/lib/utils'

/**
 * The 30-second answer.
 *
 * Reading top to bottom: can we ship right now, how healthy is the system,
 * where is the risk going, and what should we do next. Deliberately not a wall
 * of metrics — every block either states a verdict or offers an action.
 */
export function DashboardView() {
  const router = useRouter()
  const userName = useAuth((s) => s.user?.name)
  const { project, projectId } = useActiveProject()
  const { lastScanLabel } = useScanMeta()
  const { run, isScanning, canScan } = useRunScan()
  const { risks: rawRisks } = useRisks()
  const { statusFor } = useTriage(projectId)
  const { graph } = useSystemGraph()
  const { points } = useScanHistory()
  const { readiness } = useReleaseReadiness()
  const scores = useRiskScores()
  const { changes } = useChanges(5)

  const open = useMemo(
    () =>
      rawRisks
        .map((r) => ({ ...r, triage: statusFor(r.fingerprint) as TriageStatus }))
        .filter((r) => !isSuppressed(r.triage)),
    [rawRisks, statusFor],
  )
  const autoFixable = useMemo(() => open.filter((r) => r.file && r.rule), [open])

  const delta = points.length >= 2 ? points[points.length - 1].risk - points[0].risk : null

  const topRisks = useMemo(
    () =>
      [...open]
        .sort((a, b) => {
          const rank = { critical: 0, high: 1, medium: 2, low: 3 }
          return rank[a.severity] - rank[b.severity]
        })
        .slice(0, 5),
    [open],
  )

  const firstName = (userName ?? '').split(' ')[0] || 'there'

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-5 lg:p-7">
        {/* greeting + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back{firstName !== 'there' ? ` ${firstName}` : ''}!
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {project ? `${project.name} · last scan ${lastScanLabel}` : 'No repository connected'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={run}
              disabled={!canScan || isScanning}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-panel px-3.5 py-2 text-sm font-medium transition-colors hover:border-muted-foreground/40 disabled:opacity-50"
            >
              {isScanning ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
              {isScanning ? 'Scanning…' : 'Run scan'}
            </button>
            <Link
              href="/compliance/reports"
              className="hidden items-center gap-1.5 rounded-lg border border-border bg-panel px-3.5 py-2 text-sm font-medium transition-colors hover:border-muted-foreground/40 sm:flex"
            >
              <FileDown className="size-4" />
              Export
            </Link>
            <button
              onClick={() => router.push('/simulation')}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <FlaskConical className="size-4" />
              Run simulation
            </button>
          </div>
        </div>

        <ReadinessCard readiness={readiness} />

        {/* the four numbers that describe system health */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ScoreCard
            label="Risk score"
            value={scores.risk}
            suffix="/100"
            hint="0 is safe, 100 is dangerous"
            tone={bandForRisk(scores.risk)}
            href="/risks"
          />
          <ScoreCard
            label="Security score"
            value={scores.security}
            suffix="/100"
            hint="Exposure across code, config and access"
            tone={bandForHealth(scores.security)}
            href="/security"
          />
          <ScoreCard
            label="Reliability score"
            value={scores.reliability}
            suffix="/100"
            hint="Redundancy, backups and failure paths"
            tone={bandForHealth(scores.reliability)}
            href="/architecture"
          />
          <RevenueCard revenue={scores.revenueAtRisk} />
        </div>

        {/* trend + the risks behind it */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col rounded-xl border border-border bg-panel p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium">Risk over time</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-semibold tabular-nums">
                    {scores.risk ?? '—'}
                  </span>
                  {delta !== null && (
                    <span
                      className={cn(
                        'flex items-center gap-0.5 font-mono text-xs',
                        delta > 0 ? 'text-critical' : delta < 0 ? 'text-ok' : 'text-muted-foreground',
                      )}
                    >
                      {delta > 0 ? (
                        <TrendingUp className="size-3.5" />
                      ) : delta < 0 ? (
                        <TrendingDown className="size-3.5" />
                      ) : (
                        <Minus className="size-3.5" />
                      )}
                      {delta > 0 ? '+' : ''}
                      {delta} since first scan
                    </span>
                  )}
                </div>
              </div>
              <span className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground">
                All scans
              </span>
            </div>
            <div className="mt-4 flex-1">
              {points.length >= 2 ? (
                <TrendChart points={points} />
              ) : (
                <div className="flex h-44 items-center justify-center text-center">
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Run at least two scans and your risk-over-time chart appears here.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-border bg-panel">
            <CardHeader title="Top risks" href="/risks" />
            <div className="flex h-8 items-center gap-3 border-y border-border/60 px-5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="flex-1">Problem</span>
              <span className="w-20">Severity</span>
            </div>
            {topRisks.length === 0 ? (
              <p className="flex-1 px-5 py-8 text-center text-xs text-muted-foreground">
                No open risks. Run a scan to check your posture.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {topRisks.map((r) => (
                  <Link
                    key={r.id}
                    href="/risks"
                    className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-accent/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{r.title}</div>
                      <div className="truncate font-mono text-[10px] text-muted-foreground">
                        {r.components.join(', ') || r.rule || r.id}
                      </div>
                    </div>
                    <div className="w-20 shrink-0">
                      <SeverityBadge severity={r.severity} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* what to do next, what just changed, what it runs on */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {/* recommended fixes */}
          <div className="flex flex-col rounded-xl border border-border bg-panel">
            <CardHeader title="Recommended fixes" href="/code" />
            {autoFixable.length === 0 ? (
              <EmptyCard
                icon={<WandSparkles className="size-4" />}
                text="No findings Riscly can fix automatically right now."
              />
            ) : (
              <div className="divide-y divide-border/60">
                {autoFixable.slice(0, 3).map((r) => (
                  <Link
                    key={r.id}
                    href="/code"
                    className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-accent/40"
                  >
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary">
                      <FileCode className="size-3.5 text-foreground/80" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-xs font-medium leading-snug">{r.title}</div>
                      <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                        {r.file}
                        {r.line ? `:${r.line}` : ''}
                      </div>
                    </div>
                    <SeverityBadge severity={r.severity} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* recent changes */}
          <div className="flex flex-col rounded-xl border border-border bg-panel">
            <CardHeader title="Recent changes" href="/changes" />
            {changes.length === 0 ? (
              <EmptyCard
                icon={<GitCommitHorizontal className="size-4" />}
                text="Connect a repository and every commit gets judged against your architecture."
              />
            ) : (
              <div className="divide-y divide-border/60">
                {changes.slice(0, 3).map((c) => (
                  <Link
                    key={`${c.repo}-${c.sha}`}
                    href="/changes"
                    className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-accent/40"
                  >
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary">
                      <GitCommitHorizontal className="size-3.5 text-foreground/80" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{c.message}</div>
                      <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                        {c.sha} · {c.author} · {relativeTime(c.date)}
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
          </div>

          {/* architecture preview */}
          <div className="flex flex-col rounded-xl border border-border bg-panel">
            <CardHeader title="Architecture" href="/architecture" />
            {!graph || graph.nodes.length === 0 ? (
              <EmptyCard
                icon={<Network className="size-4" />}
                text="Run a scan and Riscly maps your services, databases and providers."
              />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-px border-y border-border/60 bg-border/60">
                  <MiniStat label="Components" value={graph.nodes.length} />
                  <MiniStat label="Connections" value={graph.edges.length} />
                  <MiniStat
                    label="Single points"
                    value={graph.nodes.filter((n) => n.isSinglePointOfFailure).length}
                    tone="critical"
                  />
                </div>
                <div className="divide-y divide-border/60">
                  {graph.nodes.slice(0, 3).map((n) => (
                    <Link
                      key={n.id}
                      href={`/architecture?node=${encodeURIComponent(n.id)}`}
                      className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-accent/40"
                    >
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          n.isSinglePointOfFailure ? 'bg-critical' : 'bg-ok',
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate text-xs">{n.name}</span>
                      <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground">
                        {n.kind.replace('_', ' ')}
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Release readiness -------------------------------------------------------

const VERDICT_STYLE: Record<
  ReadinessVerdict,
  { chip: string; edge: string; icon: typeof CircleCheck }
> = {
  ready: { chip: 'bg-ok text-ok-foreground', edge: 'border-ok/40', icon: CircleCheck },
  review: { chip: 'bg-medium text-medium-foreground', edge: 'border-medium/40', icon: TriangleAlert },
  blocked: { chip: 'bg-critical text-critical-foreground', edge: 'border-critical/50', icon: OctagonAlert },
}

/** The headline block: can we ship, and if not, what is in the way. */
function ReadinessCard({ readiness }: { readiness: ReadinessResult }) {
  const style = VERDICT_STYLE[readiness.verdict]
  const Icon = style.icon
  const items = [...readiness.blockers, ...readiness.warnings].slice(0, 3)

  return (
    <div className={cn('rounded-xl border bg-panel', style.edge)}>
      <div className="flex flex-wrap items-start gap-4 p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Icon className="size-5 text-foreground/80" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-[4px] px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider',
                style.chip,
              )}
            >
              {READINESS_LABEL[readiness.verdict]}
            </span>
            <span className="text-sm font-medium">Release readiness</span>
            <span className="font-mono text-xs text-muted-foreground">{readiness.score}/100</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{readiness.headline}</p>
        </div>
        <Link
          href="/assistant"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-muted-foreground/40"
        >
          <Bot className="size-3.5" />
          Ask the advisor
        </Link>
      </div>

      {items.length > 0 && (
        <div className="divide-y divide-border/60 border-t border-border/60">
          {items.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="flex items-start gap-3 px-5 py-2.5 transition-colors hover:bg-accent/40"
            >
              <SeverityBadge severity={item.severity} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium">{item.title}</div>
                <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  {item.detail}
                </div>
              </div>
              <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
            </Link>
          ))}
        </div>
      )}

      {readiness.passed.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 px-5 py-2.5">
          {readiness.passed.map((p) => (
            <span key={p} className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3 text-ok" />
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Score cards -------------------------------------------------------------

type Tone = 'ok' | 'warn' | 'bad' | 'muted'

const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-ok',
  warn: 'text-medium',
  bad: 'text-critical',
  muted: 'text-foreground',
}
const TONE_BAR: Record<Tone, string> = {
  ok: 'bg-ok',
  warn: 'bg-medium',
  bad: 'bg-critical',
  muted: 'bg-muted-foreground/40',
}

/** Higher risk is worse. */
function bandForRisk(v: number | null): Tone {
  if (v === null) return 'muted'
  return v >= 60 ? 'bad' : v >= 30 ? 'warn' : 'ok'
}
/** Higher health score is better. */
function bandForHealth(v: number | null): Tone {
  if (v === null) return 'muted'
  return v < 50 ? 'bad' : v < 75 ? 'warn' : 'ok'
}

function ScoreCard({
  label,
  value,
  suffix,
  hint,
  tone,
  href,
}: {
  label: string
  value: number | null
  suffix: string
  hint: string
  tone: Tone
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-border bg-panel p-4 transition-colors hover:border-muted-foreground/40"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <ArrowUpRight className="size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/60" />
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={cn('font-mono text-3xl font-semibold tabular-nums', TONE_TEXT[tone])}>
          {value ?? '—'}
        </span>
        <span className="font-mono text-xs text-muted-foreground">{suffix}</span>
      </div>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn('h-full rounded-full transition-all', TONE_BAR[tone])}
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </Link>
  )
}

/** Revenue exposure, or a prompt to supply the context that makes it possible. */
function RevenueCard({
  revenue,
}: {
  revenue: { amount: number; currency: string; nodeName: string } | null
}) {
  if (!revenue) {
    return (
      <Link
        href="/settings?tab=scanning"
        className="group flex flex-col rounded-xl border border-dashed border-border bg-panel p-4 transition-colors hover:border-muted-foreground/40"
      >
        <span className="text-xs text-muted-foreground">Revenue at risk</span>
        <div className="mt-1 font-mono text-3xl font-semibold tabular-nums text-muted-foreground">—</div>
        <p className="mt-auto pt-2.5 text-[11px] leading-snug text-muted-foreground">
          Add your monthly revenue and Riscly quantifies outages in money, not abstractions.
        </p>
      </Link>
    )
  }
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: revenue.currency,
    maximumFractionDigits: 0,
  }).format(revenue.amount)

  return (
    <Link
      href="/simulation"
      className="group flex flex-col rounded-xl border border-border bg-panel p-4 transition-colors hover:border-muted-foreground/40"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Revenue at risk</span>
        <ArrowUpRight className="size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/60" />
      </div>
      <div className="mt-1 font-mono text-3xl font-semibold tabular-nums text-high">{formatted}</div>
      <p className="mt-auto pt-2.5 text-[11px] leading-snug text-muted-foreground">
        If {revenue.nodeName} were down for an hour.
      </p>
    </Link>
  )
}

// --- small building blocks ---------------------------------------------------

function CardHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between px-5 pb-3 pt-5">
      <div className="text-sm font-medium">{title}</div>
      <Link href={href} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        View all <ArrowUpRight className="size-3" />
      </Link>
    </div>
  )
}

function EmptyCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 border-t border-border/60 px-5 py-8 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <p className="max-w-[16rem] text-[11px] leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'critical'
}) {
  return (
    <div className="bg-panel px-3 py-2.5 text-center">
      <div
        className={cn(
          'font-mono text-lg font-semibold tabular-nums',
          tone === 'critical' && value > 0 && 'text-critical',
        )}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  )
}

function TrendChart({ points }: { points: { at: string; risk: number }[] }) {
  const W = 720
  const H = 190
  const pad = 8
  const n = points.length

  // Fit the y-axis to the data with a little headroom, so a stable score reads
  // as a flat line through the middle instead of pinned to the top edge.
  const values = points.map((p) => p.risk)
  const lo = Math.max(0, Math.min(...values) - 12)
  const hi = Math.min(100, Math.max(...values) + 12)
  const span = Math.max(1, hi - lo)

  const x = (i: number) => pad + (i * (W - 2 * pad)) / Math.max(1, n - 1)
  const y = (r: number) => pad + ((hi - r) * (H - 2 * pad)) / span
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.risk)}`).join(' ')
  const area = `${line} L${x(n - 1)},${H - pad} L${x(0)},${H - pad} Z`

  // Gridlines at the ends and the midpoint of the visible range.
  const grid = [lo, (lo + hi) / 2, hi]

  return (
    <div className="flex h-full flex-col">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1" preserveAspectRatio="none">
        <defs>
          {/* Fade the area out toward the baseline so a flat score reads as a
              sparkline, not a filled block. */}
          <linearGradient id="risk-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="text-foreground" stopColor="currentColor" stopOpacity="0.14" />
            <stop offset="100%" className="text-foreground" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((g) => (
          <line
            key={g}
            x1={pad}
            x2={W - pad}
            y1={y(g)}
            y2={y(g)}
            className="stroke-border"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ))}
        <path d={area} fill="url(#risk-trend-fill)" />
        <path d={line} className="fill-none stroke-primary" strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.risk)} r={2.5} className="fill-primary" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>oldest scan</span>
        <span>0 = safe · 100 = risky</span>
        <span>latest</span>
      </div>
    </div>
  )
}
