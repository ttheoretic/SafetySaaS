'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Network, ShieldCheck, Activity, WandSparkles, Crosshair, FlaskConical, Bot,
  Code2, Lock, Building2, ClipboardCheck, AlertTriangle, BookOpen, Terminal,
  FileText, Newspaper, ChevronDown, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Item = { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; href: string }
type MenuId = 'platform' | 'solutions' | 'resources'
type Menu = { id: MenuId; label: string; items: Item[]; preview: React.ReactNode; cta: { label: string; href: string } }

const PLATFORM: Item[] = [
  { icon: Network, title: 'Architecture Map', desc: 'An auto-mapped view of every service, datastore and dependency.', href: '/docs/guides/scanning' },
  { icon: ShieldCheck, title: 'Security Posture', desc: 'SAST, dependency (SCA), secret and IaC scanning with confidence levels.', href: '/docs/security' },
  { icon: Activity, title: 'Code Quality', desc: 'Maintainability hotspots — catch code that will cause problems later.', href: '/docs' },
  { icon: WandSparkles, title: 'One-click Fixes', desc: 'AI-generated fixes, committed straight to your repository.', href: '/docs/guides/fixes' },
  { icon: Crosshair, title: 'Attack Paths', desc: 'Reachable paths from internet-facing entry points to sensitive data.', href: '/docs' },
  { icon: FlaskConical, title: 'Failure Simulation', desc: 'Simulate outages and quantify the business impact before they happen.', href: '/docs/guides/reliability' },
  { icon: Bot, title: 'AI Assistant', desc: 'Ask anything about your architecture, risks and how to fix them.', href: '/docs' },
]

const SOLUTIONS: Item[] = [
  { icon: Code2, title: 'For Engineering teams', desc: 'Ship faster without flying blind — see your whole system at a glance.', href: '/docs' },
  { icon: Lock, title: 'For Security teams', desc: 'Find, prioritize and remediate real, reachable risk — not noise.', href: '/docs/security' },
  { icon: Building2, title: 'For Founders & CTOs', desc: 'Reliability and revenue-at-risk in plain business terms.', href: '/docs/guides/reliability' },
  { icon: ClipboardCheck, title: 'Compliance & Audit', desc: 'A full activity trail and exportable posture for reviews.', href: '/docs' },
  { icon: AlertTriangle, title: 'Incident prevention', desc: 'Surface fragile, complex code before it turns into an outage.', href: '/docs' },
]

const RESOURCES: Item[] = [
  { icon: BookOpen, title: 'Documentation', desc: 'Guides for connecting, scanning and fixing.', href: '/docs' },
  { icon: Terminal, title: 'API Reference', desc: 'Every endpoint, with curl & JavaScript examples.', href: '/docs/api' },
  { icon: Newspaper, title: 'Blog', desc: 'Notes on architecture, security and reliability.', href: '/blog' },
  { icon: FileText, title: 'Changelog', desc: "What's new in Riscly, newest first.", href: '/changelog' },
  { icon: ShieldCheck, title: 'Data & Security', desc: 'How we handle your code, secrets and data.', href: '/docs/security' },
  { icon: BookOpen, title: 'FAQ', desc: 'Quick answers to common questions.', href: '/docs/faq' },
]

const MENUS: Menu[] = [
  { id: 'platform', label: 'Platform', items: PLATFORM, preview: <ArchitecturePreview />, cta: { label: 'Explore the platform', href: '/docs' } },
  { id: 'solutions', label: 'Solutions', items: SOLUTIONS, preview: <RiskPreview />, cta: { label: 'See your plan', href: '/pricing' } },
  { id: 'resources', label: 'Resources', items: RESOURCES, preview: <DocsPreview />, cta: { label: 'Read the docs', href: '/docs' } },
]

const FLAT_LINKS = [
  { label: 'Docs', href: '/docs' },
  { label: 'Pricing', href: '/pricing' },
]

export function MegaMenu() {
  const [active, setActive] = useState<MenuId | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const open = (id: MenuId) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActive(id)
  }
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setActive(null), 140)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActive(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const activeMenu = MENUS.find((m) => m.id === active)

  return (
    <div className="hidden md:block" onMouseLeave={scheduleClose}>
      <nav className="ml-2 flex items-center gap-1">
        {MENUS.map((m) => (
          <button
            key={m.id}
            onMouseEnter={() => open(m.id)}
            onClick={() => setActive((cur) => (cur === m.id ? null : m.id))}
            className={cn(
              'flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors',
              active === m.id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {m.label}
            <ChevronDown className={cn('size-3.5 transition-transform', active === m.id && 'rotate-180')} />
          </button>
        ))}
        {FLAT_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onMouseEnter={() => setActive(null)}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/* dropdown panel */}
      {activeMenu && (
        <div
          className="absolute left-0 right-0 top-full"
          onMouseEnter={() => open(activeMenu.id)}
          onMouseLeave={scheduleClose}
        >
          <div className="mx-auto max-w-5xl px-4 pt-2 sm:px-6">
            <div className="overflow-hidden rounded-xl border border-border bg-popover shadow-2xl shadow-black/40">
              <div className="grid grid-cols-[1.4fr_1fr]">
                {/* items */}
                <div className="grid grid-cols-2 gap-1 p-3">
                  {activeMenu.items.map((it) => (
                    <Link
                      key={it.title}
                      href={it.href}
                      onClick={() => setActive(null)}
                      className="group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20">
                        <it.icon className="size-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground group-hover:text-primary">{it.title}</span>
                        <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{it.desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
                {/* featured preview */}
                <div className="border-l border-border bg-background/60 p-4">
                  <div className="overflow-hidden rounded-lg border border-border bg-panel">
                    {activeMenu.preview}
                  </div>
                  <Link
                    href={activeMenu.cta.href}
                    onClick={() => setActive(null)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    {activeMenu.cta.label} <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Flat item list for the mobile menu. */
export const MOBILE_SECTIONS = [
  { label: 'Platform', items: PLATFORM },
  { label: 'Solutions', items: SOLUTIONS },
  { label: 'Resources', items: RESOURCES },
]

// --- Stylized app previews (resemble the real product screens) ---------------

function ArchitecturePreview() {
  return (
    <div className="relative h-44 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:14px_14px] p-3">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Architecture map</div>
      <svg viewBox="0 0 240 120" className="absolute inset-0 mt-7 h-[120px] w-full">
        <path d="M48 60 C 90 60, 90 32, 150 32" fill="none" stroke="var(--ok)" strokeWidth="1.5" />
        <path d="M48 60 C 90 60, 90 60, 150 60" fill="none" stroke="var(--high)" strokeWidth="1.5" />
        <path d="M48 60 C 90 60, 90 88, 150 88" fill="none" stroke="var(--critical)" strokeWidth="1.5" strokeDasharray="4 3" />
      </svg>
      <div className="relative flex h-[120px] items-center">
        <MiniNode className="left-2 top-1/2 -translate-y-1/2" label="API" tone="primary" />
        <MiniNode className="right-2 top-2" label="Cache" tone="ok" />
        <MiniNode className="right-2 top-1/2 -translate-y-1/2" label="Queue" tone="high" />
        <MiniNode className="bottom-2 right-2" label="Postgres" tone="critical" />
      </div>
    </div>
  )
}

function MiniNode({ label, tone, className }: { label: string; tone: 'primary' | 'ok' | 'high' | 'critical'; className?: string }) {
  const ring = { primary: 'ring-primary/40', ok: 'ring-ok/40', high: 'ring-high/50', critical: 'ring-critical/60' }[tone]
  const dot = { primary: 'bg-primary', ok: 'bg-ok', high: 'bg-high', critical: 'bg-critical' }[tone]
  return (
    <div className={cn('absolute flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 ring-1', ring, className)}>
      <span className={cn('size-1.5 rounded-full', dot)} />
      <span className="font-mono text-[10px]">{label}</span>
    </div>
  )
}

function RiskPreview() {
  const rows: { t: string; s: 'critical' | 'high' | 'medium' }[] = [
    { t: 'Hardcoded credential', s: 'critical' },
    { t: 'Single database instance', s: 'high' },
    { t: 'Missing rate limiting', s: 'medium' },
  ]
  const tone = { critical: 'bg-critical/15 text-critical', high: 'bg-high/15 text-high', medium: 'bg-medium/15 text-medium' }
  return (
    <div className="h-44 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Risk posture</span>
        <span className="flex items-center gap-1.5">
          <span className="relative flex size-7 items-center justify-center rounded-full" style={{ background: 'conic-gradient(var(--high) 250deg, var(--muted) 0deg)' }}>
            <span className="flex size-5 items-center justify-center rounded-full bg-panel font-mono text-[9px] font-semibold">72</span>
          </span>
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.t} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
            <span className={cn('rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-medium', tone[r.s])}>{r.s}</span>
            <span className="truncate text-[11px]">{r.t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DocsPreview() {
  return (
    <div className="flex h-44">
      <div className="w-1/3 space-y-1.5 border-r border-border p-3">
        {['Get started', 'Guides', 'API', 'Resources'].map((s, i) => (
          <div key={s} className={cn('rounded px-1.5 py-1 text-[10px]', i === 1 ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>{s}</div>
        ))}
      </div>
      <div className="flex-1 space-y-2 p-3">
        <div className="h-2.5 w-2/3 rounded bg-foreground/20" />
        <div className="h-1.5 w-full rounded bg-muted" />
        <div className="h-1.5 w-5/6 rounded bg-muted" />
        <div className="mt-2 rounded-md border border-border bg-[#0d1117] p-2">
          <div className="h-1.5 w-3/4 rounded bg-emerald-500/40" />
          <div className="mt-1 h-1.5 w-1/2 rounded bg-white/20" />
        </div>
      </div>
    </div>
  )
}
