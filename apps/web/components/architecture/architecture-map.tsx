'use client';

import { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Background, BackgroundVariant, Controls,
  type Edge, type Node, type NodeMouseHandler, ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  severityMeta, scoreToSeverity, type ArchModule, type ArchEdge, type Severity,
} from '@/lib/architecture';
import { ModuleNode } from './module-node';
import { ModulePanel } from './module-panel';
import { cn } from '@/lib/utils';

const nodeTypes = { module: ModuleNode };

const severityFilters: { key: Severity | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

function Flow({ modules, edges: archEdges }: { modules: ArchModule[]; edges: ArchEdge[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(modules[0]?.id ?? null);
  const [filter, setFilter] = useState<Severity | 'all'>('all');

  const selected = modules.find((m) => m.id === selectedId) ?? null;

  const passesFilter = useCallback(
    (m: ArchModule) => (filter === 'all' ? true : scoreToSeverity(m.riskScore) === filter),
    [filter],
  );

  const nodes: Node[] = useMemo(
    () =>
      modules.map((m) => ({
        id: m.id,
        type: 'module',
        position: m.position,
        data: { module: m, selected: m.id === selectedId },
        style: { opacity: passesFilter(m) ? 1 : 0.25 },
      })),
    [modules, selectedId, passesFilter],
  );

  const edges: Edge[] = useMemo(
    () =>
      archEdges.map((e) => {
        const meta = severityMeta[e.risk];
        const animated = e.risk === 'critical' || e.risk === 'high';
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          animated,
          style: {
            stroke: meta.color,
            strokeWidth: e.risk === 'critical' ? 2.5 : 1.5,
            opacity: e.risk === 'ok' || e.risk === 'low' ? 0.45 : 0.9,
          },
        };
      }),
    [archEdges],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => setSelectedId(node.id), []);

  return (
    <div className="relative flex h-full min-h-0 flex-1">
      <div className="relative min-w-0 flex-1">
        <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-lg border border-border bg-popover/90 p-1 backdrop-blur">
          {severityFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors',
                filter === f.key ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 rounded-lg border border-border bg-popover/90 p-3 backdrop-blur">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Connection risk</span>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {(['critical', 'high', 'medium', 'low', 'ok'] as Severity[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-0.5 w-4 rounded-full" style={{ background: severityMeta[s].color }} />
                {severityMeta[s].label}
              </span>
            ))}
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelectedId(null)}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.75}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="oklch(1 0 0 / 8%)" />
          <Controls
            showInteractive={false}
            className="!border-border !bg-popover [&_button]:!border-border [&_button]:!bg-popover [&_button]:!fill-foreground hover:[&_button]:!bg-secondary"
          />
        </ReactFlow>
      </div>

      {selected && (
        <ModulePanel module={selected} modules={modules} edges={archEdges} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

export function ArchitectureMap({ modules, edges }: { modules: ArchModule[]; edges: ArchEdge[] }) {
  return (
    <ReactFlowProvider>
      <Flow modules={modules} edges={edges} />
    </ReactFlowProvider>
  );
}
