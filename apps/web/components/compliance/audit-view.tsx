'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScanLine, GitCommitHorizontal, ScrollText, UserRound, ShieldCheck } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import {
  useActiveProject,
  useCommits,
  relativeTime,
  type ScanRecord,
} from '@/lib/use-project-data'

// Human labels for known audit actions.
const ACTION_LABEL: Record<string, string> = {
  'scan.run': 'Ran a scan',
  'project.fanout': 'Added repositories',
  'project.create': 'Created a project',
  'connection.create': 'Connected an integration',
  'connection.update': 'Updated an integration',
  'remediation.pr': 'Opened a remediation PR',
  'member.invite': 'Invited a member',
}
const labelFor = (a: string) => ACTION_LABEL[a] ?? a.replace(/[._]/g, ' ')

export function AuditView() {
  const token = useAuth((s) => s.token)
  const { projectId } = useActiveProject()

  // The real governance audit trail (admins+). 403 for non-admins → just hide it.
  const audit = useQuery({
    queryKey: ['audit-logs'],
    queryFn: api.auditLogs,
    enabled: Boolean(token),
    retry: false,
  })
  const auditEvents = audit.data ?? []

  // Secondary: repository & scan activity (everyone).
  const scans = useQuery({
    queryKey: ['scan-history', projectId],
    enabled: Boolean(token && projectId),
    queryFn: async () => (await api.listScans(projectId!)) as ScanRecord[],
  })
  const commits = useCommits()
  const activity = useMemo(() => {
    const out: { at: string; kind: 'scan' | 'commit'; title: string; detail: string }[] = []
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
      out.push({ at: c.date, kind: 'commit', title: c.message.split('\n')[0].slice(0, 80), detail: `${c.author} · ${c.repo} · ${c.sha.slice(0, 7)}` })
    }
    return out.filter((e) => e.at).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [scans.data, commits.data])

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Audit Log" subtitle="Who did what, when — for governance and reviews" />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {/* governance trail (actor-attributed) */}
          <section>
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" /> Governance trail
            </h2>
            {audit.isError ? (
              <p className="rounded-md border border-border bg-panel px-3 py-3 text-xs text-muted-foreground">
                The actor-attributed audit trail is visible to admins and owners only.
              </p>
            ) : auditEvents.length === 0 ? (
              <p className="rounded-md border border-border bg-panel px-3 py-3 text-xs text-muted-foreground">
                {audit.isLoading ? 'Loading…' : 'No recorded actions yet.'}
              </p>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
                {auditEvents.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 bg-panel px-3 py-2.5">
                    <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserRound className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">
                          {e.actor?.name || e.actor?.email || 'System'}
                        </span>{' '}
                        <span className="text-muted-foreground">{labelFor(e.action)}</span>
                      </p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {e.action}
                        {e.targetType ? ` · ${e.targetType}${e.targetId ? `:${e.targetId.slice(0, 8)}` : ''}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
                      {relativeTime(e.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* repository & scan activity */}
          <section>
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ScrollText className="size-3.5" /> Repository &amp; scan activity
            </h2>
            {activity.length === 0 ? (
              <p className="rounded-md border border-border bg-panel px-3 py-3 text-xs text-muted-foreground">
                Scans and commits appear here as they happen.
              </p>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
                {activity.map((e, i) => (
                  <div key={i} className="flex items-start gap-3 bg-panel px-3 py-2.5">
                    <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                      {e.kind === 'scan' ? <ScanLine className="size-3.5" /> : <GitCommitHorizontal className="size-3.5" />}
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
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
