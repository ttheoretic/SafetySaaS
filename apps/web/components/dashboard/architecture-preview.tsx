'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import ReactFlow, {
  Background, BackgroundVariant, ReactFlowProvider, type Edge, type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { useDashboard } from '@/lib/dashboard-store';
import { buildArchitecture, severityMeta, scoreToSeverity } from '@/lib/architecture';
import { ModuleNode } from '@/components/architecture/module-node';

const nodeTypes = { module: ModuleNode };

export function ArchitecturePreview() {
  const { systemGraph } = useDashboard();
  const { modules, edges: archEdges } = useMemo(() => buildArchitecture(systemGraph), [systemGraph]);

  const nodes: Node[] = useMemo(
    () => modules.map((m) => ({ id: m.id, type: 'module', position: m.position, data: { module: m, selected: false } })),
    [modules],
  );
  const edges: Edge[] = useMemo(
    () =>
      archEdges.map((e) => {
        const meta = severityMeta[e.risk];
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          animated: e.risk === 'critical' || e.risk === 'high',
          style: { stroke: meta.color, strokeWidth: e.risk === 'critical' ? 2.5 : 1.5, opacity: e.risk === 'ok' || e.risk === 'low' ? 0.45 : 0.9 },
        };
      }),
    [archEdges],
  );

  const atRisk = modules.filter((m) => ['critical', 'high'].includes(scoreToSeverity(m.riskScore))).length;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Network className="size-4 text-primary" /> Architecture Graph
          <span className="text-xs text-muted-foreground">
            · {modules.length} modules · {archEdges.length} connections
          </span>
        </div>
        <div className="flex items-center gap-3">
          {atRisk > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
              <ShieldAlert className="size-3.5" /> {atRisk} at risk
            </span>
          )}
          <Link
            href="/architecture"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[12px] font-medium text-primary-foreground hover:opacity-90"
          >
            Open System Map <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="relative h-[340px] w-full">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="oklch(1 0 0 / 8%)" />
          </ReactFlow>
        </ReactFlowProvider>
        {/* Click-through overlay → full map */}
        <Link href="/architecture" className="absolute inset-0" aria-label="Open System Map" />
      </div>
    </section>
  );
}
