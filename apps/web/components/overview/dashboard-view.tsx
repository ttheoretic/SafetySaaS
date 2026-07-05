'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ScanLine,
  FlaskConical,
  Loader2,
  ShieldAlert,
  CircleAlert,
  WandSparkles,
  Server,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  FileDown,
  FileCode,
  CheckCircle2,
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
  relativeTime,
} from '@/lib/use-project-data'
import { isSuppressed, type TriageStatus } from '@riscly/shared'
import { SeverityBadge } from '@/components/ui/severity'
import { cn } from '@/lib/utils'

/**
 * Overview in the Solaris-dashboard layout: greeting + actions, four KPI
 * cards with icon tiles, a large risk-trend chart card beside a top-risks
 * table, and a bottom row of auto-fixable finding cards. All numbers come
 * from the latest scan.
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

  const open = useMemo(
    () =>
      rawRisks
        .map((r) => ({ ...r, triage: statusFor(r.fingerprint) as TriageStatus }))
        .filter((r) => !isSuppressed(r.triage)),
    [rawRisks, statusFor],
  )
  const critical = open.filter((r) => r.severity === 'critical').length
  const autoFixable = useMemo(() => open.filter((r) => r.file && r.rule), [open])
  const services = graph?.nodes.length ?? 0

  const currentRisk = points.length ? points[points.length - 1].risk : null
  const delta = points.length >= 2 ? points[points.length - 1].risk - points[0].risk : null

  const topRisks = useMemo(
    () =>
      [...open]
        .sort((a, b) => {
          const rank = { critical: 0, high: 1, medium: 2, low: 3 }
          return rank[a.severity] - rank[b.severity]
        })
        .slice(0, 6),
    [open],
  )

  const firstName = (userName ?? '').split(' ')[0] || 'there'

  const kpis = [
    { label: 'Open findings', value: open.length, icon: ShieldAlert, href: '/risks' },
    { label: 'Critical', value: critical, icon: CircleAlert, href: '/risks', tone: critical > 0 ? 'text-critical' : undefined },
    { label: 'Auto-fixable', value: autoFixable.length, icon: WandSparkles, href: '/code', tone: 'text-primary' },
    { label: 'Services mapped', value: services, icon: Server, href: '/architecture' },
  ]

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 p-5 lg:p-7">
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

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <Link
              key={k.label}
              href={k.href}
              className="group flex items-center gap-4 rounded-xl border border-border bg-panel p-4 transition-colors hover:border-muted-foreground/40"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <k.icon className="size-5 text-foreground/80" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs text-muted-foreground">{k.label}</div>
                <div className={cn('font-mono text-2xl font-semibold tabular-nums', k.tone)}>
                  {k.value}
                </div>
              </div>
              <ArrowUpRight className="ml-auto size-4 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/60" />
            </Link>
          ))}
        </div>

        {/* chart + top risks table */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
          {/* risk trend card */}
          <div className="flex flex-col rounded-xl border border-border bg-panel p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium">Risk score</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-semibold tabular-nums">
                    {currentRisk ?? '—'}
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

          {/* top risks table */}
          <div className="flex flex-col rounded-xl border border-border bg-panel">
            <div className="flex items-center justify-between px-5 pb-3 pt-5">
              <div className="text-sm font-medium">Top risks</div>
              <Link href="/risks" className="flex items-center gap-1 text-xs text-primary hover:underline">
                View all <ArrowUpRight className="size-3" />
              </Link>
            </div>
            <div className="flex h-8 items-center gap-3 border-y border-border/60 px-5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="flex-1">Problem</span>
              <span className="w-20">Severity</span>
              <span className="hidden w-16 sm:block">Status</span>
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
                        {r.id} · {r.components.join(', ') || r.rule}
                      </div>
                    </div>
                    <div className="w-20 shrink-0">
                      <SeverityBadge severity={r.severity} />
                    </div>
                    <div className="hidden w-16 shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
                      <span className="size-1.5 rounded-full bg-medium" /> Open
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* bottom row — auto-fixable findings as cards (or recent scans) */}
        <div className="rounded-xl border border-border bg-panel">
          <div className="flex items-center justify-between px-5 pb-1 pt-5">
            <div className="text-sm font-medium">
              {autoFixable.length > 0 ? 'Auto-fixable findings' : 'Recent scans'}
            </div>
            <Link
              href={autoFixable.length > 0 ? '/code' : '/trends'}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View all <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
            {autoFixable.length > 0
              ? autoFixable.slice(0, 4).map((r) => (
                  <div key={r.id} className="flex flex-col rounded-lg border border-border bg-background/40 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-secondary">
                        <FileCode className="size-4 text-foreground/80" />
                      </span>
                      <SeverityBadge severity={r.severity} />
                    </div>
                    <div className="mt-3 line-clamp-2 text-sm font-medium leading-snug">{r.title}</div>
                    <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                      {r.file}
                      {r.line ? `:${r.line}` : ''}
                    </div>
                    <div className="mt-4 flex gap-2 border-t border-border/60 pt-3">
                      <Link
                        href="/code"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 hover:text-primary"
                      >
                        <WandSparkles className="size-3" /> View fix
                      </Link>
                      <Link
                        href="/risks"
                        className="flex flex-1 items-center justify-center rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                ))
              : [...points]
                  .reverse()
                  .slice(0, 4)
                  .map((p) => (
                    <div key={p.id} className="flex flex-col rounded-lg border border-border bg-background/40 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary">
                          <ScanLine className="size-4 text-foreground/80" />
                        </span>
                        <span className="flex items-center gap-1 rounded-[4px] bg-ok/90 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-ok-foreground">
                          <CheckCircle2 className="size-2.5" /> Done
                        </span>
                      </div>
                      <div className="mt-3 text-sm font-medium">Scan · risk {p.risk}</div>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {p.findings} findings · {relativeTime(p.at)}
                      </div>
                    </div>
                  ))}
            {autoFixable.length === 0 && points.length === 0 && (
              <p className="col-span-full py-4 text-center text-xs text-muted-foreground">
                No scans yet — run your first scan to populate the dashboard.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TrendChart({ points }: { points: { at: string; risk: number }[] }) {
  const W = 720
  const H = 190
  const pad = 8
  const n = points.length
  const x = (i: number) => pad + (i * (W - 2 * pad)) / Math.max(1, n - 1)
  const y = (r: number) => pad + ((100 - r) * (H - 2 * pad)) / 100
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.risk)}`).join(' ')
  const area = `${line} L${x(n - 1)},${H - pad} L${x(0)},${H - pad} Z`

  return (
    <div className="flex h-full flex-col">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1" preserveAspectRatio="none">
        {[0, 25, 50, 75, 100].map((g) => (
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
        <path d={area} className="fill-primary/10" />
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
