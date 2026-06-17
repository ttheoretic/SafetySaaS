'use client';

import { X, ShieldAlert, Activity, Wrench, ArrowUpRight } from 'lucide-react';
import {
  scoreToSeverity, severityMeta, moduleTypeLabel,
  type ArchModule, type ArchEdge,
} from '@/lib/architecture';
import { moduleIcon } from './module-icons';
import { RiskBadge } from '@/components/ui/risk-badge';
import { ScoreRing } from '@/components/ui/score-ring';

export function ModulePanel({
  module,
  modules,
  edges,
  onClose,
}: {
  module: ArchModule;
  modules: ArchModule[];
  edges: ArchEdge[];
  onClose: () => void;
}) {
  const severity = scoreToSeverity(module.riskScore);
  const meta = severityMeta[severity];
  const Icon = moduleIcon[module.type];

  const connections = edges
    .filter((e) => e.source === module.id || e.target === module.id)
    .map((e) => {
      const otherId = e.source === module.id ? e.target : e.source;
      const other = modules.find((m) => m.id === otherId);
      return { edge: e, other, direction: e.source === module.id ? 'out' : 'in' };
    });

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto border-l border-border bg-card md:w-[360px]">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg" style={{ background: `${meta.color}20`, color: meta.color }}>
            <Icon className="size-5" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold leading-tight text-foreground">{module.name}</h2>
            <p className="text-[12px] text-muted-foreground">{moduleTypeLabel[module.type]} · {module.tech}</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close panel">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex items-center gap-4 border-b border-border p-5">
        <ScoreRing value={module.riskScore} size={64} color={meta.color} label={String(module.riskScore)} />
        <div className="flex flex-col gap-1.5">
          <RiskBadge severity={severity} />
          <span className="text-[12px] text-muted-foreground">Uptime {module.uptime}</span>
          <p className="text-[12px] leading-snug text-muted-foreground">{module.description}</p>
        </div>
      </div>

      <Section icon={Activity} title="Live Metrics">
        <div className="grid grid-cols-3 gap-2">
          {module.metrics.map((m) => (
            <div key={m.label} className="rounded-lg border border-border bg-background/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
              <p className="mt-1 text-[13px] font-semibold tabular-nums text-foreground">{m.value}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={ShieldAlert} title={`Findings (${module.findings.length})`}>
        {module.findings.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">No active findings. This module passed all checks.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {module.findings.map((f, i) => (
              <div key={i} className="flex items-start justify-between gap-2 rounded-lg border border-border bg-background/40 p-2.5">
                <p className="text-[12px] leading-snug text-foreground">{f.title}</p>
                <RiskBadge severity={f.severity} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={ArrowUpRight} title={`Connections (${connections.length})`}>
        <div className="flex flex-col gap-1.5">
          {connections.map(({ edge, other, direction }) => {
            const cMeta = severityMeta[edge.risk];
            return (
              <div key={edge.id} className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-2.5 py-2">
                <span className="text-[11px] text-muted-foreground">{direction === 'out' ? '→' : '←'}</span>
                <span className="flex-1 text-[12px] text-foreground">{other?.name}</span>
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${cMeta.color}20`, color: cMeta.color }}>
                  {cMeta.label} link
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="mt-auto border-t border-border p-5">
        <button className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90">
          <Wrench className="size-3.5" />
          Generate Remediation Plan
        </button>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Activity;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}
