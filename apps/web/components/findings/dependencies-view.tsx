'use client'

import { useMemo, useState } from 'react'
import { Boxes, ExternalLink, PackageCheck, Search } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { SeverityBadge } from '@/components/ui/severity'
import { severityOrder, type Severity } from '@/lib/riscly-data'
import { useSystemGraph } from '@/lib/use-project-data'
import { cn } from '@/lib/utils'

/** Known dependency vulnerabilities (SCA) from the active project's latest scan. */
export function DependenciesView() {
  const { graph, loading } = useSystemGraph()
  const vulns = graph?.vulnerabilities ?? []
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    return [...vulns]
      .filter((v) =>
        query
          ? `${v.package} ${v.id} ${v.ecosystem} ${v.summary}`
              .toLowerCase()
              .includes(query.toLowerCase())
          : true,
      )
      .sort(
        (a, b) =>
          severityOrder[a.severity as Severity] - severityOrder[b.severity as Severity],
      )
  }, [vulns, query])

  const counts = useMemo(() => {
    const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    vulns.forEach((v) => (c[v.severity] = (c[v.severity] ?? 0) + 1))
    return c
  }, [vulns])

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Dependencies"
        subtitle={`${vulns.length} known vulnerabilities · ${counts.critical} critical · ${counts.high} high`}
      />

      {vulns.length === 0 ? (
        <EmptyState loading={loading} />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-5xl">
            <div className="relative mb-3 flex items-center">
              <Search className="absolute left-2.5 size-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by package, advisory, ecosystem…"
                className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-xs outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
              />
            </div>

            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-panel font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Severity</th>
                    <th className="px-3 py-2 font-medium">Package</th>
                    <th className="px-3 py-2 font-medium">Advisory</th>
                    <th className="px-3 py-2 font-medium">Fix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((v) => (
                    <tr key={`${v.id}:${v.package}`} className="hover:bg-accent/30">
                      <td className="px-3 py-2.5">
                        <SeverityBadge severity={v.severity as Severity} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-mono font-medium">{v.package}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {v.version} · {v.ecosystem}
                        </div>
                      </td>
                      <td className="max-w-md px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-foreground">{v.id}</span>
                          {v.references?.[0] && (
                            <a
                              href={v.references[0]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{v.summary}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        {v.fixedVersion ? (
                          <span className="rounded-sm bg-ok/10 px-1.5 py-0.5 font-mono text-[10px] text-ok">
                            → {v.fixedVersion}
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-muted-foreground">none</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ loading }: { loading: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-ok/10 text-ok">
          {loading ? <Boxes className="size-5 animate-pulse" /> : <PackageCheck className="size-5" />}
        </div>
        <p className="text-sm font-medium">
          {loading ? 'Loading dependencies…' : 'No known vulnerable dependencies'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {loading
            ? 'Reading the latest scan.'
            : 'Connect a repository and run a scan — Riscly resolves your manifests and checks them against the OSV vulnerability database.'}
        </p>
      </div>
    </div>
  )
}
