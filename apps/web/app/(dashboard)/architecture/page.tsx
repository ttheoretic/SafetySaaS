'use client';

import { useMemo } from 'react';
import { Network, ShieldAlert, Boxes } from 'lucide-react';
import { useDashboard } from '@/lib/dashboard-store';
import { buildArchitecture, scoreToSeverity } from '@/lib/architecture';
import { ArchitectureMap } from '@/components/architecture/architecture-map';

export default function ArchitecturePage() {
  const { systemGraph: graph } = useDashboard();
  const { modules, edges } = useMemo(() => buildArchitecture(graph), [graph]);

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
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card/20">
        <ArchitectureMap modules={modules} edges={edges} />
      </div>
    </div>
  );
}
