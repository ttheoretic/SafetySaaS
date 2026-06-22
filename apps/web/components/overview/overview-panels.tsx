'use client'

import Link from 'next/link'
import { ShieldAlert, ArrowUpRight, GitCommitHorizontal } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { SeverityBadge } from '@/components/ui/severity'
import { useRisks, useCommits, relativeTime } from '@/lib/use-project-data'
import { cn } from '@/lib/utils'

export function CriticalRisksPanel() {
  const { risks, loading } = useRisks()
  const top = [...risks]
    .filter((r) => r.severity === 'critical' || r.severity === 'high')
    .slice(0, 5)
  return (
    <Panel className="flex-1">
      <PanelHeader
        title="Top risks"
        icon={<ShieldAlert className="size-3.5 text-critical" />}
        action={
          <Link
            href="/risks"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View all <ArrowUpRight className="size-3" />
          </Link>
        }
      />
      {top.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-muted-foreground">
          {loading ? 'Loading…' : 'No critical or high risks. Run a scan to check.'}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {top.map((r) => (
            <Link
              key={r.id}
              href="/risks"
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/40"
            >
              <SeverityBadge severity={r.severity} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{r.title}</div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">
                  {r.id} · {r.components.join(', ')}
                </div>
              </div>
              {r.exploitAvailable && (
                <span className="rounded-sm bg-critical/15 px-1.5 py-0.5 font-mono text-[10px] text-critical">
                  exploit
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </Panel>
  )
}

export function RecentChangesPanel() {
  const commits = useCommits()
  const rows = commits.data ?? []

  return (
    <Panel className="flex-1">
      <PanelHeader
        title="Recent changes"
        icon={<GitCommitHorizontal className="size-3.5 text-muted-foreground" />}
      />
      {rows.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-muted-foreground">
          {commits.isLoading
            ? 'Loading…'
            : 'No recent commits from the connected repository.'}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((c) => (
            <a
              key={c.sha}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/40"
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-secondary font-mono text-[10px]">
                {c.author.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{c.message}</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {c.repo.split('/').pop() ?? c.repo} · {relativeTime(c.date)}
                </div>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {c.sha}
              </span>
            </a>
          ))}
        </div>
      )}
    </Panel>
  )
}
