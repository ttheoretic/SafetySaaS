'use client'

import { cn } from '@/lib/utils'

/** A browser-window frame so a stylized mockup reads as an in-app screenshot. */
export function Screenshot({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-panel shadow-2xl shadow-black/30', className)}>
      <div className="flex items-center gap-1.5 border-b border-border bg-background/60 px-3 py-2">
        <span className="size-2.5 rounded-full bg-critical/60" />
        <span className="size-2.5 rounded-full bg-medium/60" />
        <span className="size-2.5 rounded-full bg-ok/60" />
        <span className="ml-2 font-mono text-[10px] text-muted-foreground">{title}</span>
      </div>
      {children}
    </div>
  )
}

function Node({ label, tone, className }: { label: string; tone: 'primary' | 'ok' | 'high' | 'critical'; className?: string }) {
  const ring = { primary: 'ring-primary/40', ok: 'ring-ok/40', high: 'ring-high/50', critical: 'ring-critical/60' }[tone]
  const dot = { primary: 'bg-primary', ok: 'bg-ok', high: 'bg-high', critical: 'bg-critical' }[tone]
  return (
    <div className={cn('absolute flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 ring-1', ring, className)}>
      <span className={cn('size-2 rounded-full', dot)} />
      <span className="font-mono text-[11px]">{label}</span>
    </div>
  )
}

export function ArchitectureShot() {
  return (
    <Screenshot title="riscly · architecture">
      <div className="relative h-72 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:18px_18px] p-4">
        <svg viewBox="0 0 420 240" className="absolute inset-0 h-full w-full">
          <path d="M70 130 C 170 130, 170 60, 300 60" fill="none" stroke="var(--ok)" strokeWidth="1.75" />
          <path d="M70 130 C 170 130, 170 130, 300 130" fill="none" stroke="var(--high)" strokeWidth="1.75" />
          <path d="M70 130 C 170 130, 170 200, 300 200" fill="none" stroke="var(--critical)" strokeWidth="1.75" strokeDasharray="5 4" />
          <path d="M40 130 C 55 130, 55 130, 70 130" fill="none" stroke="var(--border)" strokeWidth="1.5" />
        </svg>
        <Node label="riscly" tone="primary" className="left-3 top-1/2 -translate-y-1/2" />
        <Node label="SafetySaaS API" tone="primary" className="left-[33%] top-1/2 -translate-y-1/2" />
        <Node label="Redis" tone="ok" className="right-4 top-5" />
        <Node label="Job Queue" tone="high" className="right-4 top-1/2 -translate-y-1/2" />
        <Node label="PostgreSQL  2" tone="critical" className="bottom-6 right-4" />
        <div className="absolute left-3 top-3 rounded-md border border-border bg-panel/90 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
          9 services · risk-weighted
        </div>
      </div>
    </Screenshot>
  )
}

export function RiskShot() {
  const rows: { id: string; t: string; s: 'critical' | 'high' | 'medium'; conf: string }[] = [
    { id: 'RSK-1042', t: 'HTTP request without timeout', s: 'critical', conf: 'verified' },
    { id: 'RSK-1043', t: 'Hardcoded credential', s: 'critical', conf: 'verified' },
    { id: 'RSK-1051', t: 'Single database instance', s: 'high', conf: 'high' },
    { id: 'RSK-1062', t: 'Permissive CORS (origin *)', s: 'medium', conf: 'heuristic' },
  ]
  const tone = { critical: 'bg-critical/15 text-critical', high: 'bg-high/15 text-high', medium: 'bg-medium/15 text-medium' }
  return (
    <Screenshot title="riscly · risks">
      <div className="h-72 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">4 open · 2 critical · 1 high</div>
          <span className="relative flex size-9 items-center justify-center rounded-full" style={{ background: 'conic-gradient(var(--high) 250deg, var(--muted) 0deg)' }}>
            <span className="flex size-6 items-center justify-center rounded-full bg-panel font-mono text-[10px] font-semibold">72</span>
          </span>
        </div>
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2">
              <span className={cn('rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase', tone[r.s])}>{r.s}</span>
              <span className="truncate text-[12px]">{r.t}</span>
              <span className="ml-auto rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{r.conf}</span>
            </div>
          ))}
        </div>
      </div>
    </Screenshot>
  )
}

export function FixShot() {
  return (
    <Screenshot title="riscly · view fix">
      <div className="h-72 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-sm bg-critical/15 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase text-critical">critical</span>
          <span className="text-[12px] font-medium">Hardcoded credential</span>
        </div>
        <div className="mb-2 font-mono text-[10px] text-muted-foreground">src/server/auth.ts:42 · secret/hardcoded</div>
        <div className="rounded-md border border-border bg-[#0d1117] p-2.5 font-mono text-[10px] leading-relaxed">
          <div className="rounded bg-critical/15 px-1 text-critical">- const KEY = &quot;sk_live_9f3a…&quot;</div>
          <div className="rounded bg-emerald-500/15 px-1 text-emerald-400">+ const KEY = process.env.STRIPE_KEY</div>
          <div className="mt-1 text-white/40">  if (!KEY) throw new Error(&apos;missing key&apos;)</div>
        </div>
        <button className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground">
          Apply fix — push to repo
        </button>
      </div>
    </Screenshot>
  )
}

export function SecurityShot() {
  const cats = [
    { l: 'SAST', v: 12, tone: 'bg-high' },
    { l: 'SCA', v: 7, tone: 'bg-medium' },
    { l: 'Secrets', v: 2, tone: 'bg-critical' },
    { l: 'IaC', v: 4, tone: 'bg-high' },
  ]
  return (
    <Screenshot title="riscly · security">
      <div className="h-72 p-4">
        <div className="mb-3 grid grid-cols-4 gap-2">
          {cats.map((c) => (
            <div key={c.l} className="rounded-md border border-border bg-background p-2 text-center">
              <div className="font-mono text-lg font-semibold">{c.v}</div>
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{c.l}</div>
            </div>
          ))}
        </div>
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Attack surface funnel</div>
        {[
          { l: 'Default branch', w: '100%', v: 25, tone: 'bg-muted-foreground/40' },
          { l: 'In production', w: '64%', v: 16, tone: 'bg-medium' },
          { l: 'Exploit available', w: '32%', v: 8, tone: 'bg-high' },
          { l: 'Internet exposed', w: '12%', v: 3, tone: 'bg-critical' },
        ].map((s) => (
          <div key={s.l} className="mt-1.5 flex items-center gap-2">
            <span className="w-28 shrink-0 text-[10px] text-muted-foreground">{s.l}</span>
            <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-secondary/50">
              <div className={cn('h-full rounded-sm', s.tone)} style={{ width: s.w }} />
              <span className="absolute inset-y-0 left-1.5 flex items-center font-mono text-[9px] font-semibold">{s.v}</span>
            </div>
          </div>
        ))}
      </div>
    </Screenshot>
  )
}

export function QualityShot() {
  const rows = [
    { f: 'src/scanner/engine.ts', s: 84, b: 'bg-critical', loc: 612, tags: ['large-file', 'high-complexity'] },
    { f: 'src/api/handlers.ts', s: 61, b: 'bg-high', loc: 410, tags: ['deep-nesting'] },
    { f: 'src/utils/legacy.ts', s: 44, b: 'bg-medium', loc: 230, tags: ['todos'] },
  ]
  return (
    <Screenshot title="riscly · code quality">
      <div className="h-72 p-4">
        <div className="mb-3 grid grid-cols-3 gap-2">
          {[['Hotspots', 7], ['Avg risk', 63], ['TODO/FIXME', 24]].map(([l, v]) => (
            <div key={l} className="rounded-md border border-border bg-background p-2">
              <div className="font-mono text-lg font-semibold">{v as number}</div>
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{l as string}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.f} className="flex items-center gap-3 rounded-md border border-border bg-background px-2.5 py-2">
              <div className="flex w-9 flex-col items-center">
                <span className="font-mono text-sm font-semibold">{r.s}</span>
                <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={cn('h-full rounded-full', r.b)} style={{ width: `${r.s}%` }} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-[11px]">{r.f}</div>
                <div className="font-mono text-[9px] text-muted-foreground">{r.loc} LOC</div>
              </div>
              <div className="hidden gap-1 sm:flex">
                {r.tags.map((t) => <span key={t} className="rounded-sm border border-border bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Screenshot>
  )
}

export function AttackShot() {
  return (
    <Screenshot title="riscly · attack paths">
      <div className="relative h-72 p-4">
        <div className="mb-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Reachable path · critical</div>
        <div className="flex items-center gap-2">
          {[
            { l: 'Internet', tone: 'border-high/50' },
            { l: 'Frontend', tone: 'border-border' },
            { l: 'API', tone: 'border-border' },
            { l: 'PostgreSQL', tone: 'border-critical/60' },
          ].map((n, i, a) => (
            <div key={n.l} className="flex items-center gap-2">
              <div className={cn('rounded-md border bg-background px-2.5 py-1.5 font-mono text-[10px]', n.tone)}>{n.l}</div>
              {i < a.length - 1 && <span className="text-critical">→</span>}
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5">
          {['No auth between API and DB', 'DB reachable from public subnet', 'Credentials in environment'].map((t) => (
            <div key={t} className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px]">
              <span className="size-1.5 rounded-full bg-critical" />{t}
            </div>
          ))}
        </div>
      </div>
    </Screenshot>
  )
}

export function SimulationShot() {
  return (
    <Screenshot title="riscly · simulation">
      <div className="h-72 p-4">
        <div className="mb-2 flex items-center gap-2 text-[12px] font-medium"><span className="size-2 rounded-full bg-critical" /> Database outage · 2h</div>
        <div className="grid grid-cols-2 gap-2">
          {[['Revenue at risk', '€4,200'], ['Affected users', '8,140'], ['Downtime', '2h 00m'], ['Worst impact', 'Checkout down']].map(([l, v]) => (
            <div key={l} className="rounded-md border border-border bg-background p-2.5">
              <div className="font-mono text-base font-semibold">{v}</div>
              <div className="text-[10px] text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-md border border-ok/30 bg-ok/5 px-2.5 py-2 text-[11px] text-foreground/90">
          Mitigation: add a read replica → −30% revenue at risk
        </div>
      </div>
    </Screenshot>
  )
}

export function AssistantShot() {
  return (
    <Screenshot title="riscly · assistant">
      <div className="h-72 space-y-2 p-4">
        <div className="ml-auto max-w-[80%] rounded-lg rounded-br-sm bg-primary/15 px-3 py-2 text-[11px]">
          What is my biggest risk and how do I fix it?
        </div>
        <div className="max-w-[88%] rounded-lg rounded-bl-sm border border-border bg-background px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          Your <span className="text-foreground">PostgreSQL</span> is a single point of failure on a critical path. Add a managed read replica and enable automated backups. I can open the change for you.
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground">
          Ask anything about your architecture…
        </div>
      </div>
    </Screenshot>
  )
}

export function ComplianceShot() {
  const rows = [
    ['scan.run', 'theo@riscly.app', '2m ago'],
    ['code.fix.commit', 'theo@riscly.app', '1h ago'],
    ['connection.create', 'system', '3h ago'],
    ['finding.triage', 'theo@riscly.app', '1d ago'],
  ]
  return (
    <Screenshot title="riscly · audit log">
      <div className="h-72 p-4">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Activity & audit trail</div>
        <div className="divide-y divide-border rounded-md border border-border">
          {rows.map((r) => (
            <div key={r[0]} className="flex items-center gap-3 px-3 py-2 text-[11px]">
              <span className="font-mono text-primary">{r[0]}</span>
              <span className="ml-auto truncate text-muted-foreground">{r[1]}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{r[2]}</span>
            </div>
          ))}
        </div>
      </div>
    </Screenshot>
  )
}

export const PREVIEWS = {
  architecture: ArchitectureShot,
  risks: RiskShot,
  fix: FixShot,
  security: SecurityShot,
  quality: QualityShot,
  attack: AttackShot,
  simulation: SimulationShot,
  assistant: AssistantShot,
  compliance: ComplianceShot,
} as const

export type PreviewKey = keyof typeof PREVIEWS
