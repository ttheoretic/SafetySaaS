'use client'

import { useRouter } from 'next/navigation'
import { useQueries } from '@tanstack/react-query'
import { GitBranch, Plus, ShieldCheck, LogOut, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { useProjects, useAddRepository } from '@/lib/use-project-data'
import { useActiveProjectStore } from '@/lib/active-project'
import type { ScanRecord } from '@/lib/use-project-data'
import { cn } from '@/lib/utils'
import { RisclyMark } from '@/components/brand/logo'

/** Risk = inverse of reliability (100 = very risky, 0 = safe). */
function riskOf(reliability?: number): number | null {
  return typeof reliability === 'number'
    ? Math.max(0, Math.min(100, Math.round(100 - reliability)))
    : null
}

function band(risk: number): { label: string; ring: string; text: string } {
  if (risk >= 75) return { label: 'Critical', ring: 'border-critical', text: 'text-critical' }
  if (risk >= 50) return { label: 'High', ring: 'border-high', text: 'text-high' }
  if (risk >= 25) return { label: 'Medium', ring: 'border-medium', text: 'text-medium' }
  return { label: 'Healthy', ring: 'border-ok', text: 'text-ok' }
}

/**
 * The launchpad: pick a repository before entering its workspace. This is where
 * users land after onboarding and on every fresh load, so they consciously
 * choose which repo's dashboard to open.
 */
export function PortfolioView() {
  const router = useRouter()
  const token = useAuth((s) => s.token)
  const user = useAuth((s) => s.user)
  const signOut = useAuth((s) => s.signOut)
  const projects = useProjects()
  const setActiveProject = useActiveProjectStore((s) => s.setActiveProject)
  const addRepo = useAddRepository()
  const list = projects.data ?? []

  // Each repo's latest scan, in parallel, for its risk score.
  const scans = useQueries({
    queries: list.map((p) => ({
      queryKey: ['scans', p.id],
      enabled: Boolean(token && p.id),
      queryFn: async (): Promise<ScanRecord | null> => {
        const all = (await api.listScans(p.id)) as ScanRecord[]
        const ok = all.filter((s) => s.status === 'succeeded')
        return ok[0] ?? all[0] ?? null
      },
    })),
  })

  const rows = list
    .map((p, i) => ({ project: p, risk: riskOf(scans[i]?.data?.reliabilityScore ?? undefined) }))
    .sort((a, b) => (b.risk ?? -1) - (a.risk ?? -1))

  const open = (id: string) => {
    setActiveProject(id)
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* slim launchpad header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
        <div className="flex items-center gap-2">
          <RisclyMark className="size-6" />
          <span className="font-semibold tracking-tight">Riscly</span>
        </div>
        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="hidden text-xs text-muted-foreground sm:inline">{user.email}</span>
          )}
          <button
            onClick={() => {
              signOut()
              router.replace('/login')
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 items-start justify-center overflow-y-auto p-6">
        <div className="w-full max-w-3xl py-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight">Choose a repository</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {list.length
                ? 'Select a repository to open its workspace. Each one has its own scans, risks and dashboard.'
                : 'Connect your first repository to get started.'}
            </p>
          </div>

          {projects.isLoading ? (
            <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading your repositories…
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rows.map(({ project, risk }) => {
                const b = risk !== null ? band(risk) : null
                return (
                  <button
                    key={project.id}
                    onClick={() => open(project.id)}
                    className="flex items-center gap-3 rounded-lg border border-border bg-panel p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/30"
                  >
                    <div
                      className={cn(
                        'flex size-12 shrink-0 items-center justify-center rounded-full border-2 font-mono text-sm font-semibold',
                        b ? cn(b.ring, b.text) : 'border-border text-muted-foreground',
                      )}
                    >
                      {risk ?? '—'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm font-medium">{project.name}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {b ? `${b.label} risk` : 'Not scanned yet'} · {project.environment ?? 'production'}
                      </p>
                    </div>
                  </button>
                )
              })}

              {/* add-repository tile */}
              <button
                onClick={addRepo.start}
                disabled={addRepo.busy}
                className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-left text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border">
                  {addRepo.busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Add repository</p>
                  <p className="mt-0.5 text-[11px]">Authorize GitHub and scan a new repo</p>
                </div>
              </button>
            </div>
          )}

          {addRepo.error && (
            <p className="mt-3 text-[11px] text-destructive">{addRepo.error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
