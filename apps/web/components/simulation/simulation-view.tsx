'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import type {
  SimulationType,
  SimulationParams,
  SystemNode,
  BusinessContext,
} from '@riscly/shared'
import {
  Play,
  Zap,
  ShieldOff,
  Server,
  Database,
  Boxes,
  Network,
  Loader2,
  TriangleAlert,
  CircleCheck,
  Activity,
  Bot,
} from 'lucide-react'
import { ScreenHeader, ActionButton } from '@/components/layout/screen-header'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import {
  useSystemGraph,
  useActiveProject,
} from '@/lib/use-project-data'
import { cn } from '@/lib/utils'

type Scenario = {
  id: string
  type: SimulationType
  params?: SimulationParams
  label: string
  target?: string
  desc: string
  icon: typeof Zap
}

const PROVIDER_TYPE: Record<string, SimulationType> = {
  stripe: 'stripe_down',
  openai: 'openai_down',
  aws: 'aws_down',
  cloudflare: 'cloudflare_down',
}

/** Build the scenario list from the real architecture — every entry targets an
 *  actual node/provider in the graph, so results are about the user's system. */
function buildScenarios(nodes: SystemNode[]): Scenario[] {
  const out: Scenario[] = [
    { id: 'traffic_10x', type: 'traffic_10x', label: 'Traffic spike', desc: '10× sustained request load', icon: Zap },
    { id: 'traffic_100x', type: 'traffic_100x', label: 'Traffic surge', desc: '100× spike / L7 flood', icon: Zap },
  ]

  for (const n of nodes.filter((n) => n.kind === 'database')) {
    out.push({ id: `db:${n.id}`, type: 'db_lock', params: { nodeId: n.id }, label: 'Database failure', target: n.name, desc: `${n.name} primary unreachable`, icon: Database })
  }
  for (const n of nodes.filter((n) => n.kind === 'cache')) {
    out.push({ id: `cache:${n.id}`, type: 'cache', params: { nodeId: n.id }, label: 'Cache outage', target: n.name, desc: `${n.name} unavailable`, icon: Boxes })
  }
  for (const n of nodes.filter((n) => n.kind === 'queue')) {
    out.push({ id: `queue:${n.id}`, type: 'queue', params: { nodeId: n.id }, label: 'Queue outage', target: n.name, desc: `${n.name} consumer down`, icon: Boxes })
  }
  for (const n of nodes.filter((n) => n.kind === 'external_api' && n.provider && PROVIDER_TYPE[n.provider])) {
    out.push({ id: `prov:${n.id}`, type: PROVIDER_TYPE[n.provider as string], label: `${n.name} down`, target: n.name, desc: `${n.provider} dependency outage`, icon: ShieldOff })
  }
  // A few service/api outages (cap to keep the list focused).
  for (const n of nodes.filter((n) => n.kind === 'api' || n.kind === 'service').slice(0, 4)) {
    out.push({ id: `svc:${n.id}`, type: 'infra_server', params: { nodeId: n.id }, label: 'Service outage', target: n.name, desc: `${n.name} instances terminated`, icon: Server })
  }
  if (nodes.some((n) => n.kind === 'dns')) {
    out.push({ id: 'dns', type: 'dns', label: 'DNS outage', desc: 'Name resolution fails', icon: Network })
  }
  return out
}

type SimResult = {
  impact: 'none' | 'degraded' | 'partial_outage' | 'full_outage'
  affectedNodeIds: string[]
  blastRadius: number
  fullOutage?: boolean
  narrative: string
  mitigations: string[]
}
type SimResponse = { result?: SimResult; revenue?: { currency?: string; totalImpact?: number } }

const IMPACT_LABEL: Record<string, string> = {
  none: 'No impact',
  degraded: 'Degraded',
  partial_outage: 'Partial outage',
  full_outage: 'Full outage',
}
const IMPACT_TONE: Record<string, { chip: string; text: string; banner: string }> = {
  none: { chip: 'bg-ok/15 text-ok', text: 'text-ok', banner: 'bg-ok/10' },
  degraded: { chip: 'bg-medium/15 text-medium', text: 'text-medium', banner: 'bg-medium/10' },
  partial_outage: { chip: 'bg-high/15 text-high', text: 'text-high', banner: 'bg-high/10' },
  full_outage: { chip: 'bg-critical/15 text-critical', text: 'text-critical', banner: 'bg-critical/10' },
}

function formatMoney(amount: number, currency?: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'EUR', maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${Math.round(amount)} ${currency ?? 'EUR'}`
  }
}

export function SimulationView() {
  const { graph } = useSystemGraph()
  const { projectId } = useActiveProject()
  const token = useAuth((s) => s.token)
  const router = useRouter()

  const scenarios = useMemo(() => (graph ? buildScenarios(graph.nodes) : []), [graph])
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0] ?? null

  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<SimResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reveal, setReveal] = useState(0)

  // Business context (optional) lets the engine quantify revenue impact.
  const business = useQuery({
    queryKey: ['business', projectId],
    queryFn: () => api.getBusiness(projectId!),
    enabled: Boolean(token && projectId),
  })

  const run = async () => {
    if (!graph || !active || busy) return
    setBusy(true)
    setError(null)
    setRes(null)
    setReveal(0)
    try {
      const r = (await api.simulate(graph, active.type, {
        params: active.params,
        business: (business.data as BusinessContext | null) ?? undefined,
        durationHours: 1,
      })) as SimResponse
      setRes(r)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Stagger-reveal the affected nodes once a result lands.
  const affected = res?.result?.affectedNodeIds ?? []
  useEffect(() => {
    if (!res) return
    setReveal(0)
    let i = 0
    const id = setInterval(() => {
      i += 1
      setReveal(i)
      if (i >= affected.length) clearInterval(id)
    }, 90)
    return () => clearInterval(id)
  }, [res, affected.length])

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <ScreenHeader title="Simulation Lab" subtitle="Inject failures against your real architecture model" />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <Boxes className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">Nothing to simulate yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Connect a repository and run a scan to build the architecture model, then inject failures here.
          </p>
        </div>
      </div>
    )
  }

  const result = res?.result
  const impact = result?.impact ?? 'none'
  const tone = IMPACT_TONE[impact]
  const affectedSet = new Set(affected.slice(0, reveal))
  const revenue =
    typeof res?.revenue?.totalImpact === 'number'
      ? formatMoney(res.revenue.totalImpact, res.revenue.currency)
      : null
  const nameById = new Map(graph.nodes.map((n) => [n.id, n.name]))

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Simulation Lab"
        subtitle="Inject failures against your real architecture model — every result is computed from your scanned graph"
        actions={
          <ActionButton variant="primary" onClick={run} disabled={busy || !active}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            {busy ? 'Running…' : res ? 'Re-run' : 'Run scenario'}
          </ActionButton>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-[240px_1fr_300px] divide-x divide-border">
        {/* scenario picker */}
        <div className="flex flex-col overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Scenarios · from your architecture
          </div>
          <div className="flex flex-col gap-1 px-2 pb-2">
            {scenarios.map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveId(s.id)
                    setRes(null)
                    setError(null)
                  }}
                  className={cn(
                    'flex items-start gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors',
                    active?.id === s.id ? 'border-primary/40 bg-accent/60' : 'border-transparent hover:bg-accent/30',
                  )}
                >
                  <Icon className={cn('mt-0.5 size-4 shrink-0', active?.id === s.id ? 'text-primary' : 'text-muted-foreground')} />
                  <div className="min-w-0">
                    <div className="text-sm">
                      {s.label}
                      {s.target && <span className="text-muted-foreground"> · {s.target}</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{s.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* result */}
        <div className="flex min-w-0 flex-col overflow-y-auto">
          {!res ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
              <Activity className="size-7 text-muted-foreground/40" />
              <p className="text-sm font-medium">
                {busy ? 'Computing blast radius…' : `Run “${active?.label}” to see its real impact`}
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                {error
                  ? error
                  : 'The engine removes the targeted component from your scanned graph and computes exactly which services become unreachable.'}
              </p>
            </div>
          ) : (
            <>
              {/* verdict */}
              <div className={cn('flex items-start gap-2.5 border-b border-border px-3 py-2.5', tone.banner)}>
                <TriangleAlert className={cn('mt-0.5 size-4 shrink-0', tone.text)} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase', tone.chip)}>
                      {IMPACT_LABEL[impact]}
                    </span>
                    <span className="text-sm font-medium">
                      {active?.label}
                      {active?.target ? ` · ${active.target}` : ''}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{result?.narrative}</p>
                </div>
              </div>

              {/* real metrics */}
              <div className="grid grid-cols-3 gap-px border-b border-border bg-border">
                <Metric label="Blast radius" value={`${Math.round((result?.blastRadius ?? 0) * 100)}%`} tone={tone.text} />
                <Metric label="Services affected" value={String(affected.length)} tone={tone.text} />
                <Metric label="Revenue impact / h" value={revenue ?? '—'} tone={revenue ? tone.text : 'text-muted-foreground'} />
              </div>

              {/* blast-radius bar */}
              <div className="border-b border-border p-3">
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Blast radius</span>
                  <span className="font-mono">{affected.length} / {graph.nodes.length} nodes</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', impact === 'full_outage' || impact === 'partial_outage' ? 'bg-critical' : impact === 'degraded' ? 'bg-medium' : 'bg-ok')}
                    style={{ width: `${Math.round((result?.blastRadius ?? 0) * 100)}%` }}
                  />
                </div>
              </div>

              {/* impact map — every node, affected ones lit up */}
              <div className="p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Impact map
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {graph.nodes.map((n) => {
                    const hit = affectedSet.has(n.id)
                    return (
                      <span
                        key={n.id}
                        className={cn(
                          'rounded-md border px-2 py-1 text-xs transition-colors duration-200',
                          hit
                            ? impact === 'full_outage' || impact === 'partial_outage'
                              ? 'border-critical/40 bg-critical/10 text-critical'
                              : 'border-medium/40 bg-medium/10 text-medium'
                            : 'border-border bg-background text-muted-foreground/60',
                        )}
                      >
                        {n.name}
                        <span className="ml-1 font-mono text-[9px] opacity-70">{n.kind}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* mitigations */}
        <div className="flex flex-col overflow-y-auto">
          <Panel className="m-0 rounded-none border-0">
            <PanelHeader title="Mitigations" icon={<TriangleAlert className="size-3.5 text-high" />} />
            <div className="p-3">
              {!result ? (
                <p className="text-xs text-muted-foreground">
                  Run the scenario to see the engine&apos;s concrete mitigations for the affected components.
                </p>
              ) : result.mitigations.length === 0 ? (
                <div className="flex items-center gap-1.5 rounded-md bg-ok/10 px-2.5 py-2 text-[11px] text-ok">
                  <CircleCheck className="size-3.5" />
                  No impact — this component already fails gracefully.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {result.mitigations.map((m, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-md border border-border bg-background p-2.5 text-[11px] leading-relaxed">
                      <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-ok" />
                      <span>{m}</span>
                    </div>
                  ))}

                  {affected.length > 0 && (
                    <div className="mt-1">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Affected services
                      </div>
                      <div className="flex flex-col gap-1">
                        {affected.slice(0, 8).map((id) => (
                          <span key={id} className="truncate font-mono text-[11px] text-muted-foreground">
                            {nameById.get(id) ?? id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <ActionButton
                    variant="primary"
                    className="mt-1 h-7 w-full justify-center"
                    onClick={() => {
                      const q =
                        `Scenario: "${active?.label}". The simulation found these mitigations:\n` +
                        result.mitigations.map((m) => `- ${m}`).join('\n') +
                        `\n\nWalk me through implementing these, with concrete steps and code where it applies.`
                      router.push(`/assistant?q=${encodeURIComponent(q)}`)
                    }}
                  >
                    <Bot className="size-3" />
                    Ask AI to plan this fix
                  </ActionButton>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-panel px-3 py-2.5">
      <div className={cn('font-mono text-lg font-semibold tabular-nums', value === '—' ? 'text-muted-foreground' : tone)}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  )
}
