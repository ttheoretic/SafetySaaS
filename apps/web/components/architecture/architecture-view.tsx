'use client'

import { useMemo, useState } from 'react'
import type { SystemGraph, NodeKind } from '@riscly/shared'
import { RefreshCw, PanelRightOpen, X, Boxes } from 'lucide-react'
import { ScreenHeader, ActionButton } from '@/components/layout/screen-header'
import { ArchitectureGraph } from './architecture-graph'
import { RiskInspector } from '@/components/shared/risk-inspector'
import { SeverityBadge, SeverityDot } from '@/components/ui/severity'
import {
  nodes as demoNodes,
  edges as demoEdges,
  risks as demoRisks,
  type Edge,
  type Risk,
  type Severity,
  type ServiceNode,
} from '@/lib/riscly-data'
import {
  useSystemGraph,
  useActiveProject,
  useLatestScan,
  useRunScan,
  downloadReport,
  findingsToRisks,
  type ApiFinding,
} from '@/lib/use-project-data'
import { Loader2, Download } from 'lucide-react'

/** Maps an API NodeKind onto the graph's visual type + a human tech label. */
const KIND_MAP: Record<
  NodeKind,
  { type: ServiceNode['type']; tech: string }
> = {
  frontend: { type: 'external', tech: 'Web client' },
  api: { type: 'gateway', tech: 'API' },
  service: { type: 'service', tech: 'Service' },
  database: { type: 'database', tech: 'Database' },
  cache: { type: 'database', tech: 'Cache' },
  queue: { type: 'queue', tech: 'Queue' },
  external_api: { type: 'external', tech: 'External API' },
  cdn: { type: 'external', tech: 'CDN' },
  dns: { type: 'external', tech: 'DNS' },
  storage: { type: 'database', tech: 'Storage' },
}

/** Which layout column a kind belongs to: 0=edge/clients, 1=services,
 *  2=dependencies (datastores + external APIs the services call). */
const KIND_COLUMN: Record<NodeKind, number> = {
  frontend: 0,
  cdn: 0,
  dns: 0,
  api: 1,
  service: 1,
  database: 2,
  cache: 2,
  queue: 2,
  storage: 2,
  // External third-party APIs (Stripe, Anthropic, …) are dependencies the
  // services call — place them with the data tier, not next to the API node.
  external_api: 2,
}

const SEV_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function worstSeverity(findings: ApiFinding[]): Severity | 'ok' {
  let best: Severity | 'ok' = 'ok'
  for (const f of findings) {
    const s = (f.severity ?? '').toLowerCase() as Severity
    if (!(s in SEV_RANK)) continue
    if (best === 'ok' || SEV_RANK[s] < SEV_RANK[best]) best = s
  }
  return best
}

// Layout constants matching the graph's coordinate space (W=150, H=56).
const COL_X = [80, 460, 840]
const ROW_TOP = 60
const ROW_GAP = 100

/** Transform the real API graph + findings into ServiceNode[] + Edge[] with a
 *  deterministic layered layout (columns by kind, rows stacked within column). */
function buildGraphData(
  graph: SystemGraph,
  findings: ApiFinding[],
): { nodes: ServiceNode[]; edges: Edge[] } {
  // Group findings per node id for severity / riskCount.
  const byNode = new Map<string, ApiFinding[]>()
  for (const f of findings) {
    if (!f.nodeId) continue
    const arr = byNode.get(f.nodeId) ?? []
    arr.push(f)
    byNode.set(f.nodeId, arr)
  }

  // Assign each node to a column, then stack them within the column.
  const colCounts = [0, 0, 0]
  const nodes: ServiceNode[] = graph.nodes.map((n) => {
    const map = KIND_MAP[n.kind] ?? {
      type: 'service' as const,
      tech: String(n.kind),
    }
    const col = KIND_COLUMN[n.kind] ?? 1
    const row = colCounts[col]++
    const nodeFindings = byNode.get(n.id) ?? []
    return {
      id: n.id,
      label: n.name,
      type: map.type,
      tech: map.tech,
      x: COL_X[col],
      y: ROW_TOP + row * ROW_GAP,
      severity: worstSeverity(nodeFindings),
      riskCount: nodeFindings.length,
    }
  })

  // Vertically center each column so the layout looks balanced.
  const maxRows = Math.max(1, ...colCounts)
  const byCol: Record<number, ServiceNode[]> = { 0: [], 1: [], 2: [] }
  nodes.forEach((node, i) => byCol[KIND_COLUMN[graph.nodes[i].kind] ?? 1].push(node))
  for (const col of [0, 1, 2]) {
    const list = byCol[col]
    const offset = ((maxRows - list.length) * ROW_GAP) / 2
    list.forEach((node) => (node.y += offset))
  }

  // Severity of an edge = worst of its two endpoints' severities.
  const sevById = new Map(nodes.map((n) => [n.id, n.severity]))
  const edgeSev = (a: string, b: string): Severity | 'ok' => {
    const sa = sevById.get(a) ?? 'ok'
    const sb = sevById.get(b) ?? 'ok'
    if (sa === 'ok') return sb
    if (sb === 'ok') return sa
    return SEV_RANK[sa] <= SEV_RANK[sb] ? sa : sb
  }
  const edges: Edge[] = graph.edges.map((e) => ({
    from: e.from,
    to: e.to,
    severity: edgeSev(e.from, e.to),
  }))

  return { nodes, edges }
}

function NodeInspector({
  node,
  risks,
  onClose,
}: {
  node: ServiceNode
  risks: Risk[]
  onClose: () => void
}) {
  const nodeRisks = risks.filter(
    (r) => r.components.includes(node.label) || r.components.includes(node.id),
  )
  const [openRisk, setOpenRisk] = useState<string | null>(null)
  const active = risks.find((r) => r.id === openRisk)

  if (active) {
    return <RiskInspector risk={active} onClose={() => setOpenRisk(null)} />
  }

  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <SeverityDot severity={node.severity} />
            <span className="font-mono text-sm font-semibold">{node.label}</span>
          </div>
          <span className="text-[11px] capitalize text-muted-foreground">
            {node.type} · {node.tech}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <div className="px-4 py-2.5">
          <div className="font-mono text-lg font-semibold">{node.riskCount}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Open risks
          </div>
        </div>
        <div className="px-4 py-2.5">
          <div className="font-mono text-lg font-semibold capitalize">
            {node.severity === 'ok' ? 'Healthy' : node.severity}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Status
          </div>
        </div>
      </div>

      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Risks on this node
      </div>
      <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {nodeRisks.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            No risks detected on this node.
          </div>
        )}
        {nodeRisks.map((r) => (
          <button
            key={r.id}
            onClick={() => setOpenRisk(r.id)}
            className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left hover:bg-accent/40"
          >
            <SeverityBadge severity={r.severity} />
            <div className="min-w-0 flex-1">
              <div className="text-xs">{r.title}</div>
              <div className="font-mono text-[10px] text-muted-foreground">{r.id}</div>
            </div>
            <PanelRightOpen className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  )
}

export function ArchitectureView() {
  const [selected, setSelected] = useState<ServiceNode | null>(null)
  const [exporting, setExporting] = useState(false)
  const { graph } = useSystemGraph()
  const { projectId } = useActiveProject()
  const scan = useLatestScan(projectId)
  const { run, isScanning, canScan } = useRunScan()

  async function exportReport() {
    if (!projectId || exporting) return
    setExporting(true)
    try {
      await downloadReport(projectId, 'full', 'pdf')
    } finally {
      setExporting(false)
    }
  }

  const { nodes, edges, risks } = useMemo(() => {
    if (graph) {
      const findings = scan.data?.findings ?? []
      const { nodes, edges } = buildGraphData(graph, findings)
      return { nodes, edges, risks: findingsToRisks(findings) }
    }
    return { nodes: demoNodes, edges: demoEdges, risks: demoRisks }
  }, [graph, scan.data])

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Architecture"
        subtitle={`${nodes.length} services mapped · risk-weighted topology`}
        actions={
          <>
            <ActionButton onClick={run} disabled={!canScan || isScanning}>
              {isScanning ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {isScanning ? 'Re-mapping…' : 'Re-map'}
            </ActionButton>
            <ActionButton onClick={exportReport} disabled={!projectId || exporting}>
              {exporting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Export
            </ActionButton>
          </>
        }
      />
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {/* legend */}
          <div className="absolute left-4 top-4 z-10 flex items-center gap-3 rounded-md border border-border bg-panel/90 px-3 py-1.5 backdrop-blur">
            {(['critical', 'high', 'medium', 'ok'] as const).map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-[11px]">
                <SeverityDot severity={s} />
                <span className="capitalize text-muted-foreground">
                  {s === 'ok' ? 'healthy' : s}
                </span>
              </span>
            ))}
          </div>
          <ArchitectureGraph
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            nodes={nodes}
            edges={edges}
          />
        </div>

        <div className="w-80 shrink-0 border-l border-border">
          {selected ? (
            <NodeInspector
              node={selected}
              risks={risks}
              onClose={() => setSelected(null)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <Boxes className="size-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">Select a node</p>
              <p className="text-xs text-muted-foreground">
                Click any service, database or queue to inspect its risks, impact
                and recommended fixes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
