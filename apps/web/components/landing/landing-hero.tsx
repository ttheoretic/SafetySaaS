'use client'

import {
  ArrowRight,
  ShieldAlert,
  Network,
  Database,
  Server,
  Cloud,
  GitPullRequestArrow,
  Check,
} from 'lucide-react'
import { GetStartedButton } from './get-started-button'

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* subtle grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] opacity-40 [background-size:28px_28px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-muted-foreground/40"
          >
            <span className="size-1.5 rounded-full bg-ok" />
            Now mapping risk across 14 repositories
            <ArrowRight className="size-3" />
          </a>

          <h1 className="mt-6 text-pretty text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            See every risk in your
            <br className="hidden sm:block" /> architecture before it ships
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Riscly maps your services, surfaces security and code
            vulnerabilities in context, and applies the fixes that actually
            matter — from default branch to production.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GetStartedButton className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto" />
            <a
              href="#how"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-panel px-5 py-2.5 text-sm font-medium transition-colors hover:border-muted-foreground/40 sm:w-auto"
            >
              <span className="font-mono text-xs text-muted-foreground">$</span>
              See how it works
            </a>
          </div>

          <p className="mt-4 font-mono text-xs text-muted-foreground/70">
            No agent required · Connect a repo in under 2 minutes
          </p>
        </div>

        <HeroVisual />
      </div>
    </section>
  )
}

const nodes = [
  { id: 'api', label: 'auth-gateway', icon: Server, sev: 'critical', x: '6%', y: '20%' },
  { id: 'svc', label: 'orders-api', icon: Network, sev: 'high', x: '40%', y: '8%' },
  { id: 'db', label: 'orders-db', icon: Database, sev: 'critical', x: '70%', y: '30%' },
  { id: 'cloud', label: 'edge-cache', icon: Cloud, sev: 'low', x: '30%', y: '60%' },
]

const sevColor: Record<string, string> = {
  critical: 'text-critical border-critical/40',
  high: 'text-high border-high/40',
  low: 'text-ok border-ok/40',
}

function HeroVisual() {
  return (
    <div className="relative mx-auto mt-14 max-w-5xl">
      <div className="overflow-hidden rounded-xl border border-border bg-panel shadow-2xl shadow-black/40 ring-1 ring-white/5">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-panel-2 px-3 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-critical/70" />
            <span className="size-2.5 rounded-full bg-medium/70" />
            <span className="size-2.5 rounded-full bg-ok/70" />
          </div>
          <div className="ml-2 flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Network className="size-3.5" />
            riscly · shopist-platform · architecture
          </div>
          <span className="ml-auto hidden items-center gap-1 rounded-md border border-critical/30 bg-critical/10 px-2 py-0.5 font-mono text-[11px] text-critical sm:inline-flex">
            <ShieldAlert className="size-3" /> Risk 82
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr]">
          {/* graph */}
          <div className="relative h-64 border-b border-border bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:22px_22px] md:border-b-0 md:border-r">
            <svg className="absolute inset-0 h-full w-full" aria-hidden>
              <line x1="14%" y1="32%" x2="44%" y2="20%" stroke="var(--critical)" strokeWidth="1.5" strokeOpacity="0.5" />
              <line x1="48%" y1="22%" x2="74%" y2="40%" stroke="var(--high)" strokeWidth="1.5" strokeOpacity="0.5" />
              <line x1="38%" y1="68%" x2="44%" y2="26%" stroke="var(--border)" strokeWidth="1.5" />
            </svg>
            {nodes.map((n) => {
              const Icon = n.icon
              return (
                <div
                  key={n.id}
                  className={`absolute flex items-center gap-1.5 rounded-md border bg-panel px-2 py-1.5 shadow-lg ${sevColor[n.sev]}`}
                  style={{ left: n.x, top: n.y }}
                >
                  <Icon className="size-3.5" />
                  <span className="font-mono text-[11px] text-foreground">{n.label}</span>
                  <span className={`size-1.5 rounded-full ${n.sev === 'critical' ? 'bg-critical' : n.sev === 'high' ? 'bg-high' : 'bg-ok'}`} />
                </div>
              )
            })}
            <div className="absolute bottom-2 left-2 rounded bg-panel/80 px-2 py-1 font-mono text-[10px] text-muted-foreground backdrop-blur">
              4 services · 2 critical paths
            </div>
          </div>

          {/* fix panel */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <GitPullRequestArrow className="size-3.5 text-primary" />
              <span className="text-xs font-medium">Suggested fix</span>
              <span className="ml-auto rounded-sm bg-critical/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-critical">
                Critical
              </span>
            </div>
            <div className="flex-1 space-y-2 px-3 py-3 font-mono text-[11px] leading-relaxed">
              <div className="text-muted-foreground">dogmover.py:318</div>
              <div className="rounded bg-critical/10 px-2 py-1 text-critical">
                - requests.post(url, json=data)
              </div>
              <div className="rounded bg-ok/10 px-2 py-1 text-ok">
                + requests.post(url, json=data, timeout=10)
              </div>
              <p className="pt-1 font-sans text-[11px] text-muted-foreground">
                Adds a request timeout to prevent indefinite hangs on
                unresponsive upstreams.
              </p>
            </div>
            <button className="m-3 mt-0 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
              <Check className="size-3.5" /> Apply &amp; open PR
            </button>
          </div>
        </div>
      </div>

      {/* glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -bottom-10 top-1/2 -z-10 bg-primary/10 blur-3xl"
      />
    </div>
  )
}
