'use client'

import { useRouter } from 'next/navigation'
import { useQueries } from '@tanstack/react-query'
import { GitBranch, LayoutGrid } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { useProjects } from '@/lib/use-project-data'
import { useActiveProjectStore } from '@/lib/active-project'
import type { ScanRecord } from '@/lib/use-project-data'
import { cn } from '@/lib/utils'

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

/** Executive view across every connected repository/project. */
export function PortfolioView() {
  const router = useRouter()
  const token = useAuth((s) => s.token)
  const projects = useProjects()
  const setActiveProject = useActiveProjectStore((s) => s.setActiveProject)
  const list = projects.data ?? []

  // Pull each project's latest scan in parallel for its risk score.
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

  const scored = rows.filter((r) => r.risk !== null)
  const avg =
    scored.length > 0
      ? Math.round(scored.reduce((s, r) => s + (r.risk ?? 0), 0) / scored.length)
      : null

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Portfolio"
        subtitle={
          list.length
            ? `${list.length} repositor${list.length === 1 ? 'y' : 'ies'}${avg !== null ? ` · avg risk ${avg}` : ''}`
            : 'No repositories connected yet'
        }
      />

      {list.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <LayoutGrid className="size-5" />
            </div>
            <p className="text-sm font-medium">
              {projects.isLoading ? 'Loading portfolio…' : 'No repositories yet'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect a repository in Settings — each one appears here with its own
              risk score, so you get a single view across your whole estate.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(({ project, risk }) => {
              const b = risk !== null ? band(risk) : null
              return (
                <button
                  key={project.id}
                  onClick={() => {
                    setActiveProject(project.id)
                    router.push('/dashboard')
                  }}
                  className="flex items-center gap-3 rounded-lg border border-border bg-panel p-3 text-left transition-colors hover:border-primary/40"
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
          </div>
        </div>
      )}
    </div>
  )
}
