'use client'

import { useMemo } from 'react'
import { Crosshair, ChevronRight, ShieldAlert } from 'lucide-react'
import type { SystemGraph } from '@riscly/shared'
import { ScreenHeader } from '@/components/layout/screen-header'
import {
  useActiveProject,
  useLatestScan,
  useSystemGraph,
} from '@/lib/use-project-data'
import type { Severity } from '@/lib/riscly-data'
import { cn } from '@/lib/utils'

const ENTRY_KINDS = new Set(['frontend', 'api', 'external_api'])
const TARGET_KINDS = new Set(['database', 'storage', 'cache', 'queue'])
const SEV_RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 }

type PathInfo = {
  nodes: { id: string; name: string; kind: string; sev: Severity | null }[]
  worst: Severity | null
  findingCount: number
}

/** Enumerate bounded simple paths from entry nodes to sensitive data stores. */
function computePaths(
  graph: SystemGraph,
  sevByNode: Map<string, Severity>,
): PathInfo[] {
  const adj = new Map<string, string[]>()
  for (const e of graph.edges) {
    adj.set(e.from, [...(adj.get(e.from) ?? []), e.to])
  }
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const entries = graph.nodes.filter((n) => ENTRY_KINDS.has(n.kind))
  const results: PathInfo[] = []
  const MAX_PATHS = 20
  const MAX_DEPTH = 7

  for (const start of entries) {
    const stack: string[][] = [[start.id]]
    while (stack.length && results.length < MAX_PATHS) {
      const path = stack.pop()!
      const last = path[path.length - 1]
      const node = byId.get(last)
      if (node && TARGET_KINDS.has(node.kind) && path.length > 1) {
        const nodes = path.map((id) => {
          const n = byId.get(id)!
          return { id, name: n.name, kind: n.kind, sev: sevByNode.get(id) ?? null }
        })
        const sevs = nodes.map((n) => n.sev).filter(Boolean) as Severity[]
        const worst =
          sevs.length > 0
            ? sevs.reduce((a, b) => (SEV_RANK[a] >= SEV_RANK[b] ? a : b))
            : null
        results.push({ nodes, worst, findingCount: sevs.length })
        continue
      }
      if (path.length >= MAX_DEPTH) continue
      for (const next of adj.get(last) ?? []) {
        if (!path.includes(next)) stack.push([...path, next])
      }
    }
  }

  // Most dangerous first: by worst severity, then by how many risky hops.
  return results.sort(
    (a, b) =>
      (b.worst ? SEV_RANK[b.worst] : 0) - (a.worst ? SEV_RANK[a.worst] : 0) ||
      b.findingCount - a.findingCount ||
      a.nodes.length - b.nodes.length,
  )
}

export function AttackPathsView() {
  const { graph } = useSystemGraph()
  const { projectId } = useActiveProject()
  const scan = useLatestScan(projectId)

  const sevByNode = useMemo(() => {
    const m = new Map<string, Severity>()
    for (const f of scan.data?.findings ?? []) {
      if (!f.nodeId) continue
      const s = (f.severity as Severity) ?? 'medium'
      const cur = m.get(f.nodeId)
      if (!cur || SEV_RANK[s] > SEV_RANK[cur]) m.set(f.nodeId, s)
    }
    return m
  }, [scan.data])

  const paths = useMemo(
    () => (graph ? computePaths(graph, sevByNode) : []),
    [graph, sevByNode],
  )

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Attack Paths"
        subtitle="How a failure or breach chains from an entry point to your data"
      />

      {!graph || paths.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Crosshair className="size-5" />
            </div>
            <p className="text-sm font-medium">No attack paths to show</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {graph
                ? 'No path from an internet-facing service to a data store was found in the current architecture.'
                : 'Connect a repository and run a scan — Riscly maps your architecture and traces how an entry point can reach sensitive data.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              {paths.length} path{paths.length === 1 ? '' : 's'} from an entry point to a
              data store. Highlighted hops carry findings — a fix on a shared hop breaks
              multiple paths at once.
            </p>
            {paths.map((p, i) => (
              <div key={i} className="rounded-md border border-border bg-panel p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase',
                      p.worst === 'critical'
                        ? 'bg-critical/15 text-critical'
                        : p.worst === 'high'
                          ? 'bg-high/15 text-high'
                          : p.worst === 'medium'
                            ? 'bg-medium/15 text-medium'
                            : p.worst === 'low'
                              ? 'bg-low/15 text-low'
                              : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {p.worst ?? 'no findings'}
                  </span>
                  {p.findingCount > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ShieldAlert className="size-3" />
                      {p.findingCount} risky hop{p.findingCount === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {p.nodes.map((n, j) => (
                    <span key={n.id} className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'rounded-md border px-2 py-1 text-xs',
                          n.sev === 'critical'
                            ? 'border-critical/40 bg-critical/10 text-critical'
                            : n.sev === 'high'
                              ? 'border-high/40 bg-high/10 text-high'
                              : n.sev === 'medium'
                                ? 'border-medium/40 bg-medium/10 text-medium'
                                : n.sev
                                  ? 'border-low/40 bg-low/10 text-low'
                                  : 'border-border bg-background text-foreground',
                        )}
                      >
                        {n.name}
                        <span className="ml-1 font-mono text-[9px] text-muted-foreground">
                          {n.kind}
                        </span>
                      </span>
                      {j < p.nodes.length - 1 && (
                        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
