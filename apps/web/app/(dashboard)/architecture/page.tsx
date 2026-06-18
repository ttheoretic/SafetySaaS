'use client';

import { useMemo, useState } from 'react';
import { Network, ShieldAlert, Boxes, Pencil } from 'lucide-react';
import { useDashboard } from '@/lib/dashboard-store';
import { buildArchitecture, scoreToSeverity } from '@/lib/architecture';
import { ArchitectureMap } from '@/components/architecture/architecture-map';
import { ArchitectureEditor } from '@/components/architecture/architecture-editor';

export default function ArchitecturePage() {
  const { systemGraph: graph } = useDashboard();
  const { modules, edges } = useMemo(() => buildArchitecture(graph), [graph]);
  const [editing, setEditing] = useState(false);

  const critical = modules.filter((m) => {
    const s = scoreToSeverity(m.riskScore);
    return s === 'critical' || s === 'high';
  }).length;
  const riskyLinks = edges.filter((e) => e.risk === 'critical' || e.risk === 'high').length;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">System Architecture</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Every module and integration, analyzed for reliability &amp; security. Click a node to inspect it.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-muted-foreground">
            <Boxes className="size-3.5 text-primary" /> {modules.length} modules
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-muted-foreground">
            <Network className="size-3.5 text-primary" /> {edges.length} connections
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-muted-foreground">
            <ShieldAlert className="size-3.5 text-destructive" /> {critical} at risk · {riskyLinks} risky links
          </span>
          <button
            onClick={() => setEditing((v) => !v)}
            className={
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors ' +
              (editing
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:text-foreground')
            }
          >
            <Pencil className="size-3.5" /> {editing ? 'Done' : 'Review & edit'}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card/20">
          <ArchitectureMap modules={modules} edges={edges} />
        </div>
        {editing && (
          <div className="min-h-0 w-80 shrink-0 overflow-hidden rounded-xl border border-border bg-card/20">
            <ArchitectureEditor />
          </div>
        )}
      </div>
    </div>
  );
}
