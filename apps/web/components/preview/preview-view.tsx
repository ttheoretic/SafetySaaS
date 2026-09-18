'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Loader2,
  Lock,
  GitBranch,
  ShieldAlert,
  WandSparkles,
  FlaskConical,
  Rocket,
  Bot,
  Network,
} from 'lucide-react'
import { api, type PreviewResult } from '@/lib/api'
import { BAND_LABEL, type DimensionScore, type RiskBand } from '@riscly/shared'
import { ArchitectureGraph } from '@/components/architecture/architecture-graph'
import { buildGraphData } from '@/lib/graph-layout'
import type { ServiceNode } from '@/lib/riscly-data'
import { cn } from '@/lib/utils'

const EXAMPLES = ['vercel/next.js', 'nestjs/nest', 'supabase/supabase']

/** What sign-up unlocks — named honestly, in the order the product uses them. */
const LOCKED = [
  { icon: ShieldAlert, title: 'Risk analysis', desc: 'Every risk with severity, evidence and the components it affects.' },
  { icon: Bot, title: 'AI security', desc: 'Models, agents and tools treated as part of your architecture.' },
  { icon: WandSparkles, title: 'AI fixes', desc: 'A reviewed patch per finding, pushed as a commit or a pull request.' },
  { icon: FlaskConical, title: 'Simulations', desc: 'Knock out a database or a provider and see how far it spreads.' },
  { icon: Rocket, title: 'Release readiness', desc: 'One verdict on whether the current state is safe to ship.' },
]

/**
 * The public preview.
 *
 * Deliberately placed before any account: seeing your own system mapped is the
 * moment the product makes sense, and asking someone to sign up and pay before
 * that is asking them to take it on faith. The map is real and free; everything
 * that interprets it needs an account.
 */
export function PreviewView() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<PreviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ServiceNode | null>(null)

  const run = async (repo: string) => {
    if (!repo.trim() || loading) return
    setLoading(true)
    setError(null)
    setSelected(null)
    try {
      setResult(await api.previewScan(repo.trim()))
    } catch (e) {
      setError((e as Error).message)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const { nodes, edges } = result
    ? buildGraphData(result.graph, [])
    : { nodes: [], edges: [] }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-28 sm:px-6">
      {/* intro + input */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          <GitBranch className="size-3.5" />
          No account needed
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          See your architecture first.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-400">
          Paste a public GitHub repository. Riscly reads it and maps the services, databases
          and providers it depends on — before you create an account.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void run(input)
          }}
          className="mt-8 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="owner/repository or a github.com URL"
            aria-label="Public GitHub repository"
            className="h-12 flex-1 rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-white/25"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Network className="size-4" />}
            {loading ? 'Mapping…' : 'Map architecture'}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500">
          <span>Try</span>
          {EXAMPLES.map((e) => (
            <button
              key={e}
              onClick={() => {
                setInput(e)
                void run(e)
              }}
              className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-zinc-400 transition-colors hover:border-white/25 hover:text-white"
            >
              {e}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>

      {result && (
        <div className="mt-14">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-sm text-white">{result.repo}</h2>
              <span className="text-xs text-zinc-500">
                {result.graph.nodes.length} components · {result.graph.edges.length} connections
              </span>
              {result.detected.map((d) => (
                <span
                  key={d}
                  className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          <PostureBanner posture={result.posture} />

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
            {/* the real thing, same renderer as the app */}
            <div className="h-[28rem] overflow-hidden rounded-xl border border-white/10 bg-[#0b0d14]">
              <ArchitectureGraph
                nodes={nodes}
                edges={edges}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
              />
            </div>

            <div className="flex flex-col gap-4">
              {/* what a component is — the depth that IS free */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {selected ? 'Component' : 'Components'}
                </h3>
                {selected ? (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-white">{selected.label}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-zinc-500">
                      {selected.tech}
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      className="mt-3 text-xs text-zinc-400 underline underline-offset-2 hover:text-white"
                    >
                      Back to all components
                    </button>
                  </div>
                ) : (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {nodes.slice(0, 9).map((n) => (
                      <li key={n.id} className="flex items-center gap-2 text-xs text-zinc-300">
                        <span className="size-1.5 shrink-0 rounded-full bg-zinc-600" />
                        <span className="truncate">{n.label}</span>
                        <span className="ml-auto shrink-0 font-mono text-[10px] text-zinc-500">
                          {n.tech}
                        </span>
                      </li>
                    ))}
                    {nodes.length > 9 && (
                      <li className="text-[11px] text-zinc-500">
                        +{nodes.length - 9} more
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* the wall — honest about what is behind it */}
              <div className="rounded-xl border border-blue-500/25 bg-blue-500/[0.06] p-4">
                <div className="flex items-start gap-2.5">
                  <Lock className="mt-0.5 size-4 shrink-0 text-blue-400" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-white">
                      {result.posture.total > 0
                        ? `${result.posture.total} risks behind this score`
                        : 'Risk analysis is the next step'}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                      This preview reads public dependency manifests only, and stops at the map.
                      Connect your repository to see what each risk is, why it matters and how
                      to fix it — and to score the two dimensions still missing above.
                    </p>
                    <Link
                      href="/login?mode=signup"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
                    >
                      Analyse this repository
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* what comes after the map */}
          <div className="mt-8">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              With an account
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {LOCKED.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="flex items-center gap-2">
                    <f.icon className="size-4 text-zinc-400" />
                    <Lock className="size-3 text-zinc-600" />
                  </div>
                  <div className="mt-2.5 text-sm font-medium text-white">{f.title}</div>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

const BAND: Record<RiskBand, { chip: string; text: string; edge: string; bar: string }> = {
  low: { chip: 'bg-emerald-500 text-emerald-950', text: 'text-emerald-400', edge: 'border-emerald-500/30', bar: 'bg-emerald-500' },
  medium: { chip: 'bg-amber-500 text-amber-950', text: 'text-amber-400', edge: 'border-amber-500/30', bar: 'bg-amber-500' },
  high: { chip: 'bg-orange-500 text-orange-950', text: 'text-orange-400', edge: 'border-orange-500/40', bar: 'bg-orange-500' },
  critical: { chip: 'bg-red-500 text-red-50', text: 'text-red-400', edge: 'border-red-500/40', bar: 'bg-red-500' },
}

function dimTone(score: number | null): string {
  if (score === null) return 'bg-zinc-700'
  if (score >= 85) return 'bg-emerald-500'
  if (score >= 70) return 'bg-amber-500'
  if (score >= 50) return 'bg-orange-500'
  return 'bg-red-500'
}

/**
 * The number that makes the case.
 *
 * It is a real score over the dimensions architecture can actually answer, and
 * it says so: the two dimensions it cannot reach are shown greyed out with what
 * they need. An incomplete score that admits what is missing argues for the
 * product better than a confident one that quietly guessed.
 */
function PostureBanner({ posture }: { posture: PreviewResult['posture'] }) {
  const band = BAND[posture.band]
  const measured = posture.dimensions.filter((d) => d.analyzed).length

  return (
    <div className={cn('rounded-xl border bg-white/[0.03] p-5', band.edge)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
        <div className="flex shrink-0 flex-col justify-center lg:w-72">
          <div className="text-xs text-zinc-400">Preliminary risk posture</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={cn('font-mono text-5xl font-semibold tabular-nums', band.text)}>
              {posture.score ?? '—'}
            </span>
            <span className="font-mono text-sm text-zinc-500">/100</span>
            <span
              className={cn(
                'ml-1 rounded-[4px] px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider',
                band.chip,
              )}
            >
              {BAND_LABEL[posture.band]}
            </span>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-zinc-300">{posture.headline}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Scored from {measured} of {posture.dimensions.length} dimensions — architecture only,
            from declared dependencies.
          </p>
        </div>

        <div className="min-w-0 flex-1 lg:border-l lg:border-white/10 lg:pl-5">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Dimensions
          </div>
          <div className="flex flex-col gap-2">
            {posture.dimensions.map((d) => (
              <DimensionRow key={d.dimension} dim={d} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DimensionRow({ dim }: { dim: DimensionScore }) {
  const locked = !dim.analyzed
  return (
    <div className={cn('flex items-center gap-3', locked && 'opacity-60')}>
      <span className="flex w-32 shrink-0 items-center gap-1.5 truncate text-xs text-zinc-300">
        {locked && <Lock className="size-3 shrink-0 text-zinc-500" />}
        {dim.label}
      </span>
      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
        <span
          className={cn('block h-full rounded-full', dimTone(dim.score))}
          style={{ width: `${dim.score ?? 0}%` }}
        />
      </span>
      {locked ? (
        <span className="w-44 shrink-0 text-right text-[11px] text-zinc-500">{dim.note}</span>
      ) : (
        <>
          <span className="w-9 shrink-0 text-right font-mono text-sm tabular-nums text-zinc-200">
            {dim.score}
          </span>
          <span className="w-32 shrink-0 text-right font-mono text-[11px] text-zinc-500">
            {dim.findings === 0
              ? 'no risks'
              : `${dim.findings} ${dim.findings === 1 ? 'risk' : 'risks'}${dim.critical > 0 ? ` · ${dim.critical} crit` : ''}`}
          </span>
        </>
      )}
    </div>
  )
}

