'use client'

import Link from 'next/link'
import { GitPullRequest, WandSparkles, Loader2, CodeXml, GitCommitHorizontal, ArrowRight } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { useRemediationPr, useCommits, useCodeIssues, relativeTime } from '@/lib/use-project-data'

export function FixesView() {
  const remediation = useRemediationPr()
  const commits = useCommits()
  const { files } = useCodeIssues()
  const fixable = files.reduce((sum, f) => sum + f.issues.length, 0)
  const recent = (commits.data ?? []).slice(0, 8)

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Fixes & PRs" subtitle="AI remediation and the changes it ships" />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {/* actions */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col rounded-md border border-border bg-panel p-4">
              <div className="mb-2 flex size-9 items-center justify-center rounded-md border border-border bg-background text-primary">
                <WandSparkles className="size-4" />
              </div>
              <p className="text-sm font-medium">Remediation PR</p>
              <p className="mt-0.5 flex-1 text-xs text-muted-foreground">
                Open a pull request with a prioritized remediation plan from the latest
                scan, on your connected repo.
              </p>
              <button
                onClick={remediation.open}
                disabled={!remediation.canOpen || remediation.busy}
                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {remediation.busy ? <Loader2 className="size-3.5 animate-spin" /> : <GitPullRequest className="size-3.5" />}
                Open remediation PR
              </button>
            </div>

            <div className="flex flex-col rounded-md border border-border bg-panel p-4">
              <div className="mb-2 flex size-9 items-center justify-center rounded-md border border-border bg-background text-primary">
                <CodeXml className="size-4" />
              </div>
              <p className="text-sm font-medium">Per-issue AI fixes</p>
              <p className="mt-0.5 flex-1 text-xs text-muted-foreground">
                {fixable > 0
                  ? `${fixable} located code issue${fixable === 1 ? '' : 's'} can get an inline AI fix.`
                  : 'Run a scan to surface located code issues that can be fixed inline.'}
              </p>
              <Link
                href="/code"
                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Open Code Analysis <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {remediation.url && (
            <a
              href={remediation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-ok/30 bg-ok/10 px-3 py-2 text-xs text-ok hover:underline"
            >
              Remediation PR opened — view on GitHub →
            </a>
          )}
          {remediation.error && <p className="text-[11px] text-destructive">{remediation.error}</p>}

          {/* applied changes */}
          <div className="overflow-hidden rounded-md border border-border">
            <div className="border-b border-border bg-panel px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Recent changes
            </div>
            {recent.length === 0 ? (
              <p className="bg-panel px-3 py-6 text-center text-xs text-muted-foreground">
                {commits.isLoading ? 'Loading commits…' : 'No recent commits on the connected repo.'}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {recent.map((c) => (
                  <div key={c.sha} className="flex items-start gap-3 bg-panel px-3 py-2.5">
                    <GitCommitHorizontal className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{c.message.split('\n')[0]}</p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {c.author} · {c.sha.slice(0, 7)}
                      </p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
                      {relativeTime(c.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            End-to-end fix tracking (suggested → PR open → merged → verified closed) lands
            with the workflow layer.
          </p>
        </div>
      </div>
    </div>
  )
}
