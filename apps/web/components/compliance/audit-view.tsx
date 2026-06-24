'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScanLine, GitCommitHorizontal, ScrollText } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import {
  useActiveProject,
  useCommits,
  relativeTime,
  type ScanRecord,
} from '@/lib/use-project-data'

type Event = {
  at: string
  kind: 'scan' | 'commit'
  title: string
  detail: string
}

export function AuditView() {
  const token = useAuth((s) => s.token)
  const { projectId } = useActiveProject()
  const scans = useQuery({
    queryKey: ['scan-history', projectId],
    enabled: Boolean(token && projectId),
    queryFn: async () => (await api.listScans(projectId!)) as ScanRecord[],
  })
  const commits = useCommits()

  const events = useMemo<Event[]>(() => {
    const out: Event[] = []
    for (const s of scans.data ?? []) {
      out.push({
        at: s.createdAt,
        kind: 'scan',
        title: `Scan ${s.status}`,
        detail:
          typeof s.reliabilityScore === 'number'
            ? `risk ${Math.max(0, Math.min(100, Math.round(100 - s.reliabilityScore)))} · ${s.findings?.length ?? 0} findings`
            : 'queued',
      })
    }
    for (const c of commits.data ?? []) {
      out.push({
        at: c.date,
        kind: 'commit',
        title: c.message.split('\n')[0].slice(0, 80),
        detail: `${c.author} · ${c.repo} · ${c.sha.slice(0, 7)}`,
      })
    }
    return out
      .filter((e) => e.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [scans.data, commits.data])

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Audit Log"
        subtitle="Scan and repository activity over time"
      />

      {events.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ScrollText className="size-5" />
            </div>
            <p className="text-sm font-medium">No activity yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Scans and commits appear here as they happen. A full user-action audit
              trail (with actor and IP) arrives with the governance layer.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 text-[11px] text-muted-foreground">
              Activity from scans and connected repositories. Full per-user audit
              trail (actor, IP, retention) ships with the governance layer.
            </p>
            <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
              {events.map((e, i) => (
                <div key={i} className="flex items-start gap-3 bg-panel px-3 py-2.5">
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                    {e.kind === 'scan' ? (
                      <ScanLine className="size-3.5" />
                    ) : (
                      <GitCommitHorizontal className="size-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{e.title}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">{e.detail}</p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
                    {relativeTime(e.at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
