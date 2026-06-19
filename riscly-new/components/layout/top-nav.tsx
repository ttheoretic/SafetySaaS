'use client'

import { useState } from 'react'
import {
  Search,
  Bell,
  ChevronDown,
  GitBranch,
  Check,
} from 'lucide-react'
import { project } from '@/lib/riscly-data'
import { cn } from '@/lib/utils'

function RiskScore({ score }: { score: number }) {
  const band =
    score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low'
  const color = {
    critical: 'text-critical',
    high: 'text-high',
    medium: 'text-medium',
    low: 'text-ok',
  }[band]
  const ring = {
    critical: 'var(--critical)',
    high: 'var(--high)',
    medium: 'var(--medium)',
    low: 'var(--ok)',
  }[band]

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-panel px-2.5 py-1">
      <div
        className="relative flex size-6 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${ring} ${score * 3.6}deg, var(--muted) 0deg)`,
        }}
      >
        <div className="flex size-4 items-center justify-center rounded-full bg-panel">
          <span className={cn('size-1.5 rounded-full')} style={{ background: ring }} />
        </div>
      </div>
      <div className="leading-none">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Risk
        </div>
        <div className={cn('font-mono text-sm font-semibold', color)}>{score}</div>
      </div>
    </div>
  )
}

const projects = ['shopist-platform', 'billing-core', 'edge-mobile-api']

export function TopNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-panel px-3">
      {/* Project selector */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm hover:border-muted-foreground/40"
        >
          <span className="size-2 rounded-sm bg-primary" />
          <span className="font-medium">{project.name}</span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <GitBranch className="size-3" />
            {project.branch}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-md border border-border bg-popover p-1 shadow-xl">
              {projects.map((p) => (
                <button
                  key={p}
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-sm bg-primary" />
                    {p}
                  </span>
                  {p === project.name && <Check className="size-3.5 text-primary" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Global search */}
      <div className="relative ml-1 hidden max-w-md flex-1 items-center md:flex">
        <Search className="absolute left-2.5 size-4 text-muted-foreground" />
        <input
          placeholder="Search risks, services, files, rules…"
          className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-12 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
        />
        <kbd className="absolute right-2 rounded-sm border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <RiskScore score={project.riskScore} />

        <button className="relative flex size-8 items-center justify-center rounded-md border border-border bg-background hover:border-muted-foreground/40">
          <Bell className="size-4 text-muted-foreground" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-critical" />
        </button>

        <button className="flex items-center gap-2 rounded-md border border-border bg-background py-1 pl-1 pr-2 hover:border-muted-foreground/40">
          <span className="flex size-6 items-center justify-center rounded-sm bg-secondary font-mono text-[11px] font-semibold">
            DO
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
