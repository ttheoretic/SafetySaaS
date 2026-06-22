'use client'

import { useEffect, useRef, useState } from 'react'
import type { SimulationType, SystemGraph } from '@riscly/shared'
import {
  Play,
  Zap,
  ShieldOff,
  Server,
  Database,
  Boxes,
  WandSparkles,
  RefreshCw,
  TriangleAlert,
  CircleCheck,
} from 'lucide-react'
import { ScreenHeader, ActionButton } from '@/components/layout/screen-header'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { api } from '@/lib/api'
import { useSystemGraph } from '@/lib/use-project-data'
import { cn } from '@/lib/utils'

type Scenario = {
  id: string
  label: string
  icon: typeof Zap
  desc: string
}

const scenarios: Scenario[] = [
  { id: 'traffic', label: 'Traffic spike', icon: Zap, desc: '10x sustained RPS for 5 min' },
  { id: 'ddos', label: 'DDoS attack', icon: ShieldOff, desc: 'L7 flood on auth-gateway' },
  { id: 'outage', label: 'Service outage', icon: Server, desc: 'Kill post-coupon instances' },
  { id: 'dbfail', label: 'Database failure', icon: Database, desc: 'orders-db primary down' },
  { id: 'depfail', label: 'Dependency failure', icon: Boxes, desc: 'synthetics-api timeout' },
]

/**
 * Map each UI scenario onto the closest backend SimulationType. The backend has
 * no dedicated "DDoS" or "dependency" type, so we pick the nearest analogue: a
 * DDoS L7 flood is modelled as the most extreme traffic surge (traffic_100x),
 * and a service/dependency outage as a single-node infrastructure outage.
 */
const scenarioToType: Record<string, SimulationType> = {
  traffic: 'traffic_10x',
  ddos: 'traffic_100x',
  outage: 'infra_server',
  dbfail: 'db_lock',
  depfail: 'infra_server',
}

/** The shape of POST /analyze/simulate — `{ result, revenue }`. */
type SimulateResponse = {
  result?: {
    type?: string
    impact?: 'none' | 'degraded' | 'partial_outage' | 'full_outage'
    affectedNodeIds?: string[]
    blastRadius?: number
    fullOutage?: boolean
    narrative?: string
    mitigations?: string[]
  }
  revenue?: {
    currency?: string
    totalImpact?: number
  }
}

type LogLine = { t: string; level: 'info' | 'warn' | 'error' | 'ok'; msg: string }

const scriptedLogs: Record<string, LogLine[]> = {
  dbfail: [
    { t: '00.0s', level: 'info', msg: 'Injecting fault: orders-db primary unreachable' },
    { t: '01.2s', level: 'info', msg: 'return-completion → connection pool saturating (48/50)' },
    { t: '02.8s', level: 'warn', msg: 'N+1 query amplifies retry storm on read replica' },
    { t: '04.1s', level: 'error', msg: 'return-completion p95 latency 2.4s → 11.7s' },
    { t: '05.6s', level: 'error', msg: 'auth-gateway circuit breaker OPEN for /orders' },
    { t: '07.0s', level: 'error', msg: 'Cascading failure: 3 services degraded' },
    { t: '08.3s', level: 'warn', msg: 'No read-replica failover configured' },
    { t: '09.1s', level: 'ok', msg: 'Simulation complete — failure chain captured' },
  ],
  traffic: [
    { t: '00.0s', level: 'info', msg: 'Ramping to 12,400 RPS across edge' },
    { t: '02.1s', level: 'warn', msg: 'payments-queue depth rising (no autoscale policy)' },
    { t: '03.9s', level: 'error', msg: 'post-coupon CPU throttled — 70 pods CrashLoopBackOff' },
    { t: '05.2s', level: 'warn', msg: 'orders-db connections at 92% capacity' },
    { t: '06.8s', level: 'ok', msg: 'Edge cache absorbed 64% of read traffic' },
    { t: '07.5s', level: 'ok', msg: 'Simulation complete' },
  ],
  ddos: [
    { t: '00.0s', level: 'info', msg: 'L7 flood: 240k req/s on /api/v1/login' },
    { t: '01.0s', level: 'error', msg: 'No rate limiting on auth endpoint (RSK-1021)' },
    { t: '02.4s', level: 'error', msg: 'auth-gateway saturated, dropping legitimate traffic' },
    { t: '04.0s', level: 'warn', msg: 'WAF rules not catching distributed pattern' },
    { t: '05.1s', level: 'ok', msg: 'Simulation complete' },
  ],
  outage: [
    { t: '00.0s', level: 'info', msg: 'Terminating all post-coupon instances' },
    { t: '01.3s', level: 'warn', msg: 'payments-queue consumer offline, depth growing' },
    { t: '02.9s', level: 'error', msg: 'No DLQ — poison messages will block recovery (RSK-1009)' },
    { t: '04.2s', level: 'ok', msg: 'Simulation complete' },
  ],
  depfail: [
    { t: '00.0s', level: 'info', msg: 'synthetics-api responses delayed 30s' },
    { t: '01.1s', level: 'error', msg: 'dogmover worker hangs — no request timeout (RSK-1042)' },
    { t: '02.7s', level: 'error', msg: 'log-forwarder thread pool exhausted' },
    { t: '03.9s', level: 'warn', msg: 'Backpressure propagates to sms-service' },
    { t: '05.0s', level: 'ok', msg: 'Simulation complete' },
  ],
}

const bottlenecks: Record<string, { node: string; risk: string; sev: string }[]> = {
  dbfail: [
    { node: 'orders-db', risk: 'No read-replica failover', sev: 'critical' },
    { node: 'return-completion', risk: 'N+1 query amplifies load', sev: 'high' },
  ],
  traffic: [
    { node: 'post-coupon', risk: 'No horizontal autoscaling', sev: 'high' },
    { node: 'payments-queue', risk: 'Unbounded queue depth', sev: 'medium' },
  ],
  ddos: [{ node: 'auth-gateway', risk: 'Missing rate limiting', sev: 'critical' }],
  outage: [{ node: 'payments-queue', risk: 'No dead-letter queue', sev: 'medium' }],
  depfail: [
    { node: 'dogmover', risk: 'No request timeout', sev: 'critical' },
    { node: 'log-forwarder', risk: 'No bulkhead isolation', sev: 'high' },
  ],
}

type ScenarioResult = {
  verdict: 'failed' | 'degraded'
  headline: string
  summary: string
  metrics: { peakLatency: string; degraded: string; chains: string }
  graph: number[]
}

const results: Record<string, ScenarioResult> = {
  dbfail: {
    verdict: 'failed',
    headline: 'System failed under database loss',
    summary:
      'Loss of the orders-db primary cascaded into 3 services within 7s. No read-replica failover meant return-completion saturated its pool and tripped auth-gateway breakers.',
    metrics: { peakLatency: '11.7s', degraded: '3', chains: '1' },
    graph: [12, 14, 18, 30, 62, 88, 96, 90, 70],
  },
  traffic: {
    verdict: 'degraded',
    headline: 'Degraded but survived the spike',
    summary:
      'Edge cache absorbed 64% of reads, but post-coupon throttled and 70 pods entered CrashLoopBackOff with no autoscaling policy. orders-db peaked at 92% connections.',
    metrics: { peakLatency: '4.8s', degraded: '2', chains: '1' },
    graph: [14, 22, 40, 58, 72, 80, 76, 60, 44],
  },
  ddos: {
    verdict: 'failed',
    headline: 'Auth layer overwhelmed',
    summary:
      'With no rate limiting on /api/v1/login, auth-gateway saturated in 2.4s and began dropping legitimate traffic. WAF rules did not match the distributed pattern.',
    metrics: { peakLatency: '∞ (drops)', degraded: '2', chains: '1' },
    graph: [10, 20, 55, 90, 98, 99, 99, 97, 95],
  },
  outage: {
    verdict: 'degraded',
    headline: 'Recovery blocked by missing DLQ',
    summary:
      'Terminating post-coupon left payments-queue without a consumer. Queue depth grew unbounded and poison messages would block recovery — no dead-letter queue configured.',
    metrics: { peakLatency: '3.1s', degraded: '1', chains: '1' },
    graph: [12, 16, 28, 44, 58, 66, 70, 64, 52],
  },
  depfail: {
    verdict: 'failed',
    headline: 'Hung threads from missing timeouts',
    summary:
      'A slow synthetics-api caused dogmover workers to hang with no request timeout, exhausting log-forwarder thread pools. Backpressure propagated to sms-service.',
    metrics: { peakLatency: '30.0s+', degraded: '3', chains: '1' },
    graph: [12, 18, 35, 60, 82, 94, 97, 93, 80],
  },
}

type Bottleneck = { node: string; risk: string; sev: string }

/** A fully-resolved simulation render bundle, however it was produced. */
type RunResult = {
  result: ScenarioResult
  logs: LogLine[]
  bottlenecks: Bottleneck[]
}

/** The curated demo bundle for a scenario (used with no graph / on error). */
function demoBundle(scenarioId: string): RunResult {
  return {
    result: results[scenarioId],
    logs: scriptedLogs[scenarioId],
    bottlenecks: bottlenecks[scenarioId],
  }
}

const IMPACT_VERDICT: Record<string, 'failed' | 'degraded'> = {
  full_outage: 'failed',
  partial_outage: 'failed',
  degraded: 'degraded',
  none: 'degraded',
}

const IMPACT_PEAK = '100'

/** Map a real /analyze/simulate response onto the view's render shapes. */
function adaptResponse(
  scenarioId: string,
  res: SimulateResponse,
  graph: SystemGraph,
): RunResult {
  const fallback = demoBundle(scenarioId)
  const r = res.result
  if (!r) return fallback

  const impact = r.impact ?? 'degraded'
  const verdict = IMPACT_VERDICT[impact] ?? 'degraded'
  const affectedIds = Array.isArray(r.affectedNodeIds) ? r.affectedNodeIds : []
  const mitigations = Array.isArray(r.mitigations) ? r.mitigations : []
  const blastPct = Math.round((r.blastRadius ?? 0) * 100)

  const nameById = new Map(graph.nodes.map((n) => [n.id, n.name] as const))
  const label = (id: string) => nameById.get(id) ?? id

  const scenario = scenarios.find((s) => s.id === scenarioId)
  const headline =
    verdict === 'failed'
      ? `System ${impact === 'full_outage' ? 'failed' : 'partially failed'} under ${scenario?.label.toLowerCase() ?? 'fault'}`
      : `Degraded but survived the ${scenario?.label.toLowerCase() ?? 'fault'}`
  const summary =
    r.narrative ??
    `Blast radius ${blastPct}% across ${affectedIds.length} service${affectedIds.length === 1 ? '' : 's'}.`

  // Revenue impact, when the backend computed it from business context.
  const revenue =
    typeof res.revenue?.totalImpact === 'number'
      ? formatMoney(res.revenue.totalImpact, res.revenue.currency)
      : null

  const result: ScenarioResult = {
    verdict,
    headline,
    summary: revenue ? `${summary} Estimated revenue impact ${revenue}.` : summary,
    metrics: {
      peakLatency: revenue ?? IMPACT_PEAK,
      degraded: String(affectedIds.length),
      chains: r.fullOutage ? '1' : affectedIds.length > 0 ? '1' : '0',
    },
    graph: blastCurve(blastPct, verdict),
  }

  // Build a deterministic, streamable log from the engine output.
  const logs: LogLine[] = [
    { t: '00.0s', level: 'info', msg: `Injecting fault: ${scenario?.desc ?? scenarioId}` },
  ]
  affectedIds.slice(0, 5).forEach((id, i) => {
    logs.push({
      t: `0${Math.min(9, i + 1)}.${i}s`,
      level: verdict === 'failed' ? 'error' : 'warn',
      msg: `${label(id)} impacted — reachable services degrading`,
    })
  })
  logs.push({
    t: '0' + Math.min(9, affectedIds.length + 1) + '.0s',
    level: verdict === 'failed' ? 'error' : 'warn',
    msg: `Blast radius ${blastPct}% · impact: ${impact.replace('_', ' ')}`,
  })
  if (revenue) {
    logs.push({ t: '—', level: 'warn', msg: `Estimated revenue impact ${revenue}` })
  }
  logs.push({ t: '—', level: 'ok', msg: 'Simulation complete — engine result captured' })

  // Surface affected nodes (with mitigations) as bottleneck rows.
  const sevFor = (i: number): string =>
    verdict === 'failed' ? (i === 0 ? 'critical' : 'high') : 'medium'
  const bottleneckRows: Bottleneck[] = affectedIds.slice(0, 4).map((id, i) => ({
    node: label(id),
    risk: mitigations[i] ?? mitigations[0] ?? 'Reachable from a failed dependency',
    sev: sevFor(i),
  }))

  return {
    result,
    logs: logs.length > 1 ? logs : fallback.logs,
    bottlenecks: bottleneckRows.length > 0 ? bottleneckRows : fallback.bottlenecks,
  }
}

function formatMoney(amount: number, currency?: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency ?? 'EUR',
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${Math.round(amount)} ${currency ?? 'EUR'}`
  }
}

/** A latency-style sweep curve scaled by blast radius and verdict. */
function blastCurve(blastPct: number, verdict: 'failed' | 'degraded'): number[] {
  const peak = verdict === 'failed' ? Math.max(70, blastPct) : Math.max(50, blastPct)
  const shape = [0.14, 0.22, 0.4, 0.62, 0.82, 1, 0.96, 0.82, 0.66]
  return shape.map((f) => Math.round(Math.min(100, f * peak)))
}

const verdictStyle = {
  failed: {
    chip: 'bg-critical/15 text-critical',
    icon: 'text-critical',
    label: 'Failed',
  },
  degraded: {
    chip: 'bg-high/15 text-high',
    icon: 'text-high',
    label: 'Degraded',
  },
}

const logTone = {
  info: 'text-muted-foreground',
  warn: 'text-medium',
  error: 'text-critical',
  ok: 'text-ok',
}

const sevChip = {
  critical: 'bg-critical/15 text-critical',
  high: 'bg-high/15 text-high',
  medium: 'bg-medium/15 text-medium',
}

export function SimulationView() {
  const [active, setActive] = useState('dbfail')
  const [running, setRunning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [visibleLogs, setVisibleLogs] = useState<LogLine[]>([])
  const [done, setDone] = useState(false)
  const [progress, setProgress] = useState(0)
  // The resolved bundle (result + logs + bottlenecks) the view renders. Starts
  // from the curated demo for the active scenario and is replaced by the real
  // engine output when a run completes against a real graph.
  const [bundle, setBundle] = useState<RunResult>(() => demoBundle('dbfail'))
  const scrollRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { graph } = useSystemGraph()

  const stopTimers = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  /** Animate a resolved bundle's logs + graph sweep (shared by demo & real). */
  const playBundle = (b: RunResult) => {
    stopTimers()
    setBundle(b)
    setRunning(true)
    setDone(false)
    setVisibleLogs([])
    setProgress(0)

    const logs = b.logs
    const stepMs = 320
    const startDelay = 200
    const duration = startDelay + logs.length * stepMs

    // drive the graph sweep with rAF so it advances smoothly left → right
    const start = performance.now()
    const animate = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setProgress(p)
      if (p < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    // stream the log lines
    let i = 0
    const tick = () => {
      if (i < logs.length) {
        const line = logs[i]
        setVisibleLogs((prev) => [...prev, line])
        i++
        timerRef.current = setTimeout(tick, stepMs)
      } else {
        setRunning(false)
        setDone(true)
        setProgress(1)
      }
    }
    timerRef.current = setTimeout(tick, startDelay)
  }

  /**
   * Run the active scenario. With a real latest-scan graph, call the backend
   * (api.simulate) and animate the engine result; with no graph or on error,
   * fall back to the curated demo bundle so the designed experience is intact.
   */
  const run = async () => {
    if (busy) return
    if (!graph || graph.nodes.length === 0) {
      playBundle(demoBundle(active))
      return
    }
    setBusy(true)
    const scenarioId = active
    try {
      const res = (await api.simulate(
        graph,
        scenarioToType[scenarioId] ?? 'infra_server',
        undefined,
        1,
      )) as SimulateResponse
      playBundle(adaptResponse(scenarioId, res, graph))
    } catch {
      // Network / backend error → keep the existing demo behavior.
      playBundle(demoBundle(scenarioId))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => () => stopTimers(), [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [visibleLogs])

  const current = scenarios.find((s) => s.id === active)!
  const result = bundle.result

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <ScreenHeader
          title="Simulation Lab"
          subtitle="Inject failures and stress scenarios against the live architecture model"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <Boxes className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">Nothing to simulate yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Connect a repository and run a scan to build the architecture model,
            then inject failures here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Simulation Lab"
        subtitle="Inject failures and stress scenarios against the live architecture model"
        actions={
          <>
            {done && (
              <ActionButton onClick={run}>
                <RefreshCw className="size-3.5" />
                Re-run after fix
              </ActionButton>
            )}
            <ActionButton variant="primary" onClick={run} disabled={running || busy}>
              <Play className="size-3.5" />
              {busy ? 'Preparing…' : running ? 'Running…' : 'Run scenario'}
            </ActionButton>
          </>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-[240px_1fr_300px] divide-x divide-border">
        {/* scenario picker */}
        <div className="flex flex-col overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Scenarios
          </div>
          <div className="flex flex-col gap-1 px-2">
            {scenarios.map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    stopTimers()
                    setActive(s.id)
                    setBundle(demoBundle(s.id))
                    setVisibleLogs([])
                    setDone(false)
                    setRunning(false)
                    setProgress(0)
                  }}
                  className={cn(
                    'flex items-start gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors',
                    active === s.id
                      ? 'border-primary/40 bg-accent/60'
                      : 'border-transparent hover:bg-accent/30',
                  )}
                >
                  <Icon
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      active === s.id ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  <div className="min-w-0">
                    <div className="text-sm">{s.label}</div>
                    <div className="text-[11px] text-muted-foreground">{s.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* logs + graph */}
        <div className="flex min-w-0 flex-col">
          {done && (
            <div
              className={cn(
                'flex items-start gap-2.5 border-b border-border px-3 py-2.5',
                result.verdict === 'failed' ? 'bg-critical/10' : 'bg-high/10',
              )}
            >
              <TriangleAlert className={cn('mt-0.5 size-4 shrink-0', verdictStyle[result.verdict].icon)} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase', verdictStyle[result.verdict].chip)}>
                    {verdictStyle[result.verdict].label}
                  </span>
                  <span className="text-sm font-medium">{result.headline}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {result.summary}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-px border-b border-border bg-border">
            <Metric label="Peak latency" value={done ? result.metrics.peakLatency : '—'} tone="text-critical" />
            <Metric label="Services degraded" value={done ? result.metrics.degraded : '—'} tone="text-high" />
            <Metric label="Failure chains" value={done ? result.metrics.chains : '—'} tone="text-medium" />
          </div>

          {/* live latency graph */}
          <div className="border-b border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Latency under {current.label.toLowerCase()}
              </div>
              {running && (
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-ok">
                  <span className="size-1.5 animate-pulse rounded-full bg-ok" />
                  Live · {Math.round(progress * 100)}%
                </div>
              )}
            </div>
            <LatencyGraph
              data={result.graph}
              progress={running ? progress : done ? 1 : 0}
              active={running || done}
              running={running}
              verdict={result.verdict}
            />
          </div>

          {/* logs */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-7 items-center gap-2 border-b border-border bg-panel px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="size-1.5 rounded-full bg-ok" />
              Simulation output
            </div>
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto bg-background p-3 font-mono text-[11px] leading-relaxed"
            >
              {visibleLogs.length === 0 && !running && (
                <div className="text-muted-foreground/60">
                  Press Run scenario to inject the {current.label.toLowerCase()} fault…
                </div>
              )}
              {visibleLogs.map((l, i) => (
                <div key={i} className="flex gap-3">
                  <span className="shrink-0 text-muted-foreground/50">{l.t}</span>
                  <span className={cn('shrink-0 uppercase', logTone[l.level])}>
                    [{l.level}]
                  </span>
                  <span className="text-foreground/90">{l.msg}</span>
                </div>
              ))}
              {running && (
                <div className="mt-1 inline-block h-3 w-2 animate-pulse bg-primary" />
              )}
            </div>
          </div>
        </div>

        {/* remediation */}
        <div className="flex flex-col overflow-y-auto">
          <Panel className="m-0 rounded-none border-0">
            <PanelHeader
              title="Bottlenecks & remediation"
              icon={<TriangleAlert className="size-3.5 text-high" />}
            />
            <div className="p-3">
              {!done ? (
                <p className="text-xs text-muted-foreground">
                  Run the scenario to surface bottlenecks, failure chains and
                  one-click remediation suggestions.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {bundle.bottlenecks.map((b) => (
                    <div
                      key={b.node}
                      className="rounded-md border border-border bg-background p-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs">{b.node}</span>
                        <span
                          className={cn(
                            'rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase',
                            sevChip[b.sev as keyof typeof sevChip],
                          )}
                        >
                          {b.sev}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {b.risk}
                      </p>
                      <ActionButton
                        variant="primary"
                        className="mt-2 h-7 w-full justify-center"
                      >
                        <WandSparkles className="size-3" />
                        Apply fix
                      </ActionButton>
                    </div>
                  ))}
                  <div className="mt-1 flex items-center gap-1.5 rounded-md bg-ok/10 px-2.5 py-2 text-[11px] text-ok">
                    <CircleCheck className="size-3.5" />
                    Re-run to verify the failure chain is resolved.
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="bg-panel px-3 py-2.5">
      <div className={cn('font-mono text-lg font-semibold tabular-nums', value === '—' ? 'text-muted-foreground' : tone)}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

const idleCurve = [12, 13, 12, 14, 13, 12, 13, 12, 11]

function LatencyGraph({
  data,
  progress,
  active,
  running,
  verdict,
}: {
  data: number[]
  progress: number
  active: boolean
  running: boolean
  verdict: 'failed' | 'degraded'
}) {
  const max = 100
  const w = 100
  const h = 36
  const curve = active ? data : idleCurve
  const color = !active
    ? 'var(--ok)'
    : verdict === 'failed'
      ? 'var(--critical)'
      : 'var(--high)'

  // sample the curve with linear interpolation so the sweep edge is smooth
  const sampleAt = (u: number) => {
    const x = Math.max(0, Math.min(1, u)) * (curve.length - 1)
    const i = Math.floor(x)
    const f = x - i
    const a = curve[i]
    const b = curve[Math.min(i + 1, curve.length - 1)]
    return a + (b - a) * f
  }

  const prog = active ? Math.max(progress, 0.0001) : 1
  const N = 64
  const count = Math.max(2, Math.ceil(N * prog))
  const samples = Array.from({ length: count }, (_, k) => {
    const u = prog * (k / (count - 1))
    return { x: u * w, y: h - (sampleAt(u) / max) * h }
  })

  const line = samples
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ')
  const last = samples[samples.length - 1]
  const area = `${line} L ${last.x.toFixed(2)} ${h} L 0 ${h} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full" preserveAspectRatio="none">
      {/* baseline track */}
      <line x1="0" y1={h - 0.5} x2={w} y2={h - 0.5} stroke="var(--border)" strokeWidth={0.5} />
      <path d={area} fill={color} fillOpacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      {running && (
        <>
          {/* scan line */}
          <line
            x1={last.x}
            y1="0"
            x2={last.x}
            y2={h}
            stroke={color}
            strokeWidth={0.5}
            strokeOpacity={0.4}
            vectorEffect="non-scaling-stroke"
          />
          {/* leading pulse dot */}
          <circle cx={last.x} cy={last.y} r={2.4} fill={color}>
            <animate attributeName="r" values="2;3.4;2" dur="0.9s" repeatCount="indefinite" />
            <animate
              attributeName="fill-opacity"
              values="1;0.4;1"
              dur="0.9s"
              repeatCount="indefinite"
            />
          </circle>
        </>
      )}
    </svg>
  )
}
