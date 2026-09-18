'use client'

import { useMemo, useState } from 'react'
import type { SystemGraph } from '@riscly/shared'
import { RefreshCw, PanelRightOpen, X, Boxes } from 'lucide-react'
import { ScreenHeader, ActionButton } from '@/components/layout/screen-header'
import { ArchitectureGraph } from './architecture-graph'
import { RiskInspector } from '@/components/shared/risk-inspector'
import { SeverityBadge, SeverityDot } from '@/components/ui/severity'
import {
  type Edge,
  type Risk,
  type Severity,
  type ServiceNode,
} from '@/lib/riscly-data'
import { buildGraphData } from '@/lib/graph-layout'
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
    return { nodes: [] as ServiceNode[], edges: [] as Edge[], risks: [] as Risk[] }
  }, [graph, scan.data])
  const isEmpty = nodes.length === 0

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
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <Boxes className="size-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No architecture mapped yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Connect a repository and run a scan to map your services and their
                dependencies.
              </p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="w-[26rem] shrink-0 border-l border-border">
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
