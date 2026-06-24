'use client'

import { Boxes } from 'lucide-react'
import type { NodeKind, SystemNode } from '@riscly/shared'
import { ScreenHeader } from '@/components/layout/screen-header'
import { useSystemGraph } from '@/lib/use-project-data'
import { cn } from '@/lib/utils'

const KIND_LABEL: Record<string, string> = {
  frontend: 'Frontend',
  api: 'API',
  service: 'Service',
  database: 'Database',
  cache: 'Cache',
  queue: 'Queue',
  external_api: 'External API',
  cdn: 'CDN',
  dns: 'DNS',
  storage: 'Storage',
}

/**
 * A read-only inventory of system nodes from the active project's latest scan,
 * filtered to a set of kinds. Powers both the Services and Data Stores pages.
 */
export function NodeInventory({
  title,
  subtitle,
  kinds,
  emptyHint,
}: {
  title: string
  subtitle: string
  kinds: NodeKind[]
  emptyHint: string
}) {
  const { graph, loading } = useSystemGraph()
  const kindSet = new Set(kinds)
  const nodes = (graph?.nodes ?? []).filter((n) => kindSet.has(n.kind))

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title={title} subtitle={`${nodes.length} ${subtitle}`} />

      {nodes.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Boxes className={cn('size-5', loading && 'animate-pulse')} />
            </div>
            <p className="text-sm font-medium">
              {loading ? 'Loading inventory…' : `No ${title.toLowerCase()} yet`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading ? 'Reading the latest scan.' : emptyHint}
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-md border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-panel font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Provider</th>
                  <th className="px-3 py-2 font-medium">Region</th>
                  <th className="px-3 py-2 font-medium">Resilience</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {nodes.map((n) => (
                  <tr key={n.id} className="bg-panel hover:bg-accent/30">
                    <td className="px-3 py-2.5 font-medium">{n.name}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {KIND_LABEL[n.kind] ?? n.kind}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                      {n.provider ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                      {n.region ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <ResilienceTags node={n} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ResilienceTags({ node }: { node: SystemNode }) {
  const tags: { label: string; ok: boolean }[] = []
  if (node.redundant !== undefined) tags.push({ label: 'redundant', ok: node.redundant })
  if (node.hasBackup !== undefined) tags.push({ label: 'backup', ok: node.hasBackup })
  if (node.hasRateLimit !== undefined) tags.push({ label: 'rate-limit', ok: node.hasRateLimit })
  if (tags.length === 0) return <span className="text-muted-foreground/50">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t.label}
          className={cn(
            'rounded-sm px-1.5 py-0.5 font-mono text-[10px]',
            t.ok ? 'bg-ok/10 text-ok' : 'bg-critical/10 text-critical',
          )}
        >
          {t.ok ? '✓' : '✕'} {t.label}
        </span>
      ))}
    </div>
  )
}
