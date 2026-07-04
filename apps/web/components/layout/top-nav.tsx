'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  ChevronDown,
  GitBranch,
  Check,
  Plus,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { api } from '@/lib/api'
import { FeedbackWidget } from './feedback-widget'
import { NotificationBell } from './notification-bell'
import { ProfileMenu } from './profile-menu'
import { useAuth } from '@/lib/auth-store'
import {
  useProjects,
  useActiveProject,
  useReliability,
  useAddRepository,
} from '@/lib/use-project-data'
import { useActiveProjectStore } from '@/lib/active-project'
import { cn } from '@/lib/utils'

function RiskScore({ score }: { score: number | null }) {
  const band =
    score == null
      ? 'low'
      : score >= 75
        ? 'critical'
        : score >= 50
          ? 'high'
          : score >= 25
            ? 'medium'
            : 'low'
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
          background: `conic-gradient(${ring} ${(score ?? 0) * 3.6}deg, var(--muted) 0deg)`,
        }}
      >
        <div className="flex size-4 items-center justify-center rounded-full bg-panel">
          <span className="size-1.5 rounded-full" style={{ background: ring }} />
        </div>
      </div>
      <div className="leading-none">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Risk
        </div>
        <div className={cn('font-mono text-sm font-semibold', color)}>
          {score == null ? '—' : score}
        </div>
      </div>
    </div>
  )
}

export function TopNav() {
  const [open, setOpen] = useState(false)
  const addRepo = useAddRepository()
  const token = useAuth((s) => s.token)
  const projects = useProjects()
  const { project } = useActiveProject()
  const setActiveProject = useActiveProjectStore((s) => s.setActiveProject)
  const { score: reliability } = useReliability()

  const me = useQuery({ queryKey: ['me'], queryFn: api.me, enabled: Boolean(token) })
  const list = projects.data ?? []

  // Top-bar risk = inverse of reliability (higher reliability = lower risk).
  const riskScore =
    reliability == null
      ? null
      : Math.max(0, Math.min(100, 100 - Math.round(reliability)))
  const activeName = project?.name ?? 'No repository'

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-panel px-3">
      {/* Repository / project switcher — each repo is its own project. */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm hover:border-muted-foreground/40"
        >
          <GitBranch className="size-3.5 text-muted-foreground" />
          <span className="max-w-[180px] truncate font-medium">{activeName}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-border bg-popover p-1 shadow-xl">
              <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Repositories
              </div>
              <div className="max-h-72 overflow-y-auto">
                {list.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                    {projects.isLoading ? 'Loading…' : 'No repositories yet.'}
                  </p>
                )}
                {list.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveProject(p.id)
                      setOpen(false)
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{p.name}</span>
                    </span>
                    {project?.id === p.id && (
                      <Check className="size-3.5 shrink-0 text-primary" />
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-1 border-t border-border pt-1">
                <button
                  onClick={() => {
                    setOpen(false)
                    addRepo.start()
                  }}
                  disabled={addRepo.busy}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-primary hover:bg-accent disabled:opacity-50"
                >
                  {addRepo.busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Plus className="size-3.5" />
                  )}
                  Add repository
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Global search */}
      <div className="relative ml-1 hidden max-w-md flex-1 items-center md:flex">
        <Search className="absolute left-2.5 size-4 text-muted-foreground" />
        <input
          id="global-search"
          placeholder="Search risks, services, files, rules…"
          className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-12 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
        />
        <kbd className="absolute right-2 rounded-sm border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <RiskScore score={riskScore} />

        {me.data?.platformAdmin && (
          <Link
            href="/admin"
            title="Admin console"
            className="hidden size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground sm:flex"
          >
            <ShieldCheck className="size-4" />
          </Link>
        )}

        <FeedbackWidget />

        <NotificationBell />

        <ProfileMenu />
      </div>
    </header>
  )
}
