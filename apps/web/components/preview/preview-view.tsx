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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
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
                      {result.locked.total > 0
                        ? `${result.locked.total} risks already visible in this architecture`
                        : 'Risk analysis is the next step'}
                    </h3>
                    {result.locked.total > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Count label="critical" value={result.locked.critical} tone="text-red-400 border-red-500/30" />
                        <Count label="high" value={result.locked.high} tone="text-orange-400 border-orange-500/30" />
                        <Count label="medium" value={result.locked.medium} tone="text-amber-400 border-amber-500/30" />
                        <Count label="low" value={result.locked.low} tone="text-blue-400 border-blue-500/30" />
                      </div>
                    )}
                    <p className="mt-2.5 text-xs leading-relaxed text-zinc-400">
                      This preview reads public code only, and stops at the map. Connect your
                      repository to see what each risk is, why it matters and how to fix it.
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

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  if (value === 0) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]',
        tone,
      )}
    >
      {value} {label}
    </span>
  )
}
