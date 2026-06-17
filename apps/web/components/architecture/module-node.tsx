import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import {
  scoreToSeverity, severityMeta, moduleTypeLabel, type ArchModule,
} from '@/lib/architecture';
import { moduleIcon } from './module-icons';
import { cn } from '@/lib/utils';

export type ModuleNodeData = {
  module: ArchModule;
  selected: boolean;
};

export const ModuleNode = memo(function ModuleNode({ data }: { data: ModuleNodeData }) {
  const { module, selected } = data;
  const severity = scoreToSeverity(module.riskScore);
  const meta = severityMeta[severity];
  const Icon = moduleIcon[module.type];
  const criticalCount = module.findings.filter(
    (f) => f.severity === 'critical' || f.severity === 'high',
  ).length;

  return (
    <div
      className={cn(
        'w-52 cursor-pointer rounded-xl border bg-card p-3 transition-all',
        selected ? 'border-primary' : 'border-border hover:border-foreground/25',
      )}
      style={{
        boxShadow: selected
          ? '0 0 0 1px var(--primary)'
          : `0 0 24px -16px ${meta.color}`,
      }}
    >
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-muted-foreground" />
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-muted-foreground" />

      <div className="flex items-start gap-2.5">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-md"
          style={{ background: `${meta.color}20`, color: meta.color }}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{module.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{moduleTypeLabel[module.type]}</p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ background: meta.color }} />
          <span className="text-[11px] font-medium" style={{ color: meta.color }}>Risk {module.riskScore}</span>
        </div>
        {criticalCount > 0 && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{ background: `${meta.color}20`, color: meta.color }}
          >
            {criticalCount} issue{criticalCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full" style={{ width: `${module.riskScore}%`, background: meta.color }} />
      </div>
    </div>
  );
});
