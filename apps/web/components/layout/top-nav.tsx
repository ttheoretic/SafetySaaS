'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Bell,
  ChevronDown,
  GitBranch,
  Check,
  Loader2,
  ScanLine,
  Lock,
} from 'lucide-react'
import { PLAN_LIMITS, type Plan } from '@riscly/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import {
  useActiveProject,
  useReliability,
  useRunScan,
} from '@/lib/use-project-data'
import { project as demoProject } from '@/lib/riscly-data'
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
          <span className="size-1.5 rounded-full" style={{ background: ring }} />
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

function initialsOf(s: string): string {
  const parts = s.trim().split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase()
}

/** Short repo label "owner/name" → "name". */
function repoLabel(repo: string): string {
  return repo.split('/').pop() ?? repo
}

export function TopNav() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const token = useAuth((s) => s.token)
  const { project, projectId } = useActiveProject()
  const { score: reliability, isDemo } = useReliability()
  const { run, isScanning } = useRunScan()

  const me = useQuery({ queryKey: ['me'], queryFn: api.me, enabled: Boolean(token) })
  const plan = (me.data?.activeOrg.plan as Plan | undefined) ?? 'starter'
  const maxRepos = PLAN_LIMITS[plan]?.maxRepos ?? 1
  const maxLabel = Number.isFinite(maxRepos) ? String(maxRepos) : '∞'

  const connections = useQuery({
    queryKey: ['connections', projectId],
    queryFn: () => api.listConnections(projectId!),
    enabled: Boolean(token && projectId),
  })
  const gh = connections.data?.find((c) => c.provider === 'github')
  const allRepos = (gh?.metadata?.repos as string[] | undefined) ?? []
  const selectedRepos =
    (gh?.metadata?.selectedRepos as string[] | undefined) ??
    (allRepos.length ? [allRepos[0]] : [])

  const [busyRepo, setBusyRepo] = useState<string | null>(null)
  const [limitHit, setLimitHit] = useState(false)

  async function toggleRepo(repo: string) {
    if (!projectId || !gh) return
    const isSelected = selectedRepos.includes(repo)
    // Keep at least one repo selected.
    if (isSelected && selectedRepos.length === 1) return
    if (!isSelected && Number.isFinite(maxRepos) && selectedRepos.length >= maxRepos) {
      setLimitHit(true)
      return
    }
    setLimitHit(false)
    const next = isSelected
      ? selectedRepos.filter((r) => r !== repo)
      : [...selectedRepos, repo]
    setBusyRepo(repo)
    try {
      await api.updateConnection(projectId, gh.id, { selectedRepos: next })
      await qc.invalidateQueries({ queryKey: ['connections', projectId] })
    } catch {
      /* surfaced by the unchanged checkbox state */
    } finally {
      setBusyRepo(null)
    }
  }

  // Top-bar risk = inverse of the reliability score (higher reliability = lower risk).
  const riskScore = isDemo
    ? demoProject.riskScore
    : Math.max(0, Math.min(100, 100 - Math.round(reliability)))
  const projectName = project?.name ?? demoProject.name
  const hasRepos = Boolean(projectId && gh && allRepos.length > 0)
  const userLabel = me.data?.user.name ?? me.data?.user.email ?? ''

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-panel px-3">
      {/* Project + repo selector */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm hover:border-muted-foreground/40"
        >
          <span className="size-2 rounded-sm bg-primary" />
          <span className="font-medium">{projectName}</span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <GitBranch className="size-3" />
            {hasRepos
              ? `${selectedRepos.length} repo${selectedRepos.length === 1 ? '' : 's'}`
              : 'main'}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border border-border bg-popover p-1 shadow-xl">
              <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <span>Repositories</span>
                <span className="font-mono normal-case">
                  {hasRepos ? selectedRepos.length : 0} / {maxLabel}
                </span>
              </div>

              {hasRepos ? (
                <>
                  <div className="max-h-64 overflow-y-auto">
                    {allRepos.map((repo) => {
                      const checked = selectedRepos.includes(repo)
                      const atLimit =
                        !checked &&
                        Number.isFinite(maxRepos) &&
                        selectedRepos.length >= maxRepos
                      return (
                        <button
                          key={repo}
                          onClick={() => toggleRepo(repo)}
                          disabled={busyRepo !== null || atLimit}
                          className={cn(
                            'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent disabled:opacity-50',
                            atLimit && 'cursor-not-allowed',
                          )}
                          title={atLimit ? `Plan limit: ${maxLabel} repos` : undefined}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className={cn(
                                'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
                                checked
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border',
                              )}
                            >
                              {busyRepo === repo ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : checked ? (
                                <Check className="size-3" />
                              ) : atLimit ? (
                                <Lock className="size-2.5 text-muted-foreground" />
                              ) : null}
                            </span>
                            <span className="truncate">{repoLabel(repo)}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {limitHit && (
                    <p className="px-2 py-1 text-[11px] text-high">
                      Your {plan} plan scans up to {maxLabel} repositories.
                    </p>
                  )}

                  <div className="mt-1 border-t border-border pt-1">
                    <button
                      onClick={() => {
                        setOpen(false)
                        run()
                      }}
                      disabled={isScanning}
                      className="flex w-full items-center justify-center gap-1.5 rounded-sm bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isScanning ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ScanLine className="size-3.5" />
                      )}
                      {isScanning ? 'Scanning…' : 'Re-scan selected'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  {projectId
                    ? 'Connect a GitHub repository in onboarding.'
                    : 'Demo workspace — connect a project to manage repos.'}
                </p>
              )}
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
        <RiskScore score={riskScore} />

        <button className="relative flex size-8 items-center justify-center rounded-md border border-border bg-background hover:border-muted-foreground/40">
          <Bell className="size-4 text-muted-foreground" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-critical" />
        </button>

        <button className="flex items-center gap-2 rounded-md border border-border bg-background py-1 pl-1 pr-2 hover:border-muted-foreground/40">
          <span className="flex size-6 items-center justify-center rounded-sm bg-secondary font-mono text-[11px] font-semibold">
            {userLabel ? initialsOf(userLabel) : 'DO'}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
