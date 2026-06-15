'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Play, Save, Loader2 } from 'lucide-react';
import {
  runScenario,
  exampleGraph,
  exampleBusiness,
  Impact,
  SimulationType,
} from '@failsafe/shared';
import { PageHeader, Card, SeverityBadge } from '@/components/ui';
import { useAuth } from '@/lib/auth-store';
import { api } from '@/lib/api';

const SIM_TYPES: { type: SimulationType; label: string; kind: 'outage' | 'traffic' | 'business' }[] = [
  { type: 'dns', label: 'DNS outage', kind: 'outage' },
  { type: 'db_lock', label: 'Database lock', kind: 'outage' },
  { type: 'cache', label: 'Cache outage', kind: 'outage' },
  { type: 'queue', label: 'Queue outage', kind: 'outage' },
  { type: 'infra_region', label: 'Region failure', kind: 'outage' },
  { type: 'stripe_down', label: 'Stripe down', kind: 'outage' },
  { type: 'openai_down', label: 'OpenAI down', kind: 'outage' },
  { type: 'aws_down', label: 'AWS down', kind: 'outage' },
  { type: 'cloudflare_down', label: 'Cloudflare down', kind: 'outage' },
  { type: 'traffic_10x', label: '10× traffic', kind: 'traffic' },
  { type: 'traffic_100x', label: '100× traffic', kind: 'traffic' },
  { type: 'viral_peak', label: 'Viral peak', kind: 'traffic' },
  { type: 'churn_wave', label: 'Churn wave', kind: 'business' },
  { type: 'payment_failure', label: 'Payment failures', kind: 'business' },
  { type: 'refund_spike', label: 'Refund spike', kind: 'business' },
];

const IMPACT_SEV: Record<Impact, string> = {
  full_outage: 'critical',
  partial_outage: 'high',
  degraded: 'medium',
  none: 'low',
};

interface Step { type: SimulationType; intensity: number }

function kindOf(type: SimulationType) {
  return SIM_TYPES.find((s) => s.type === type)?.kind ?? 'outage';
}
function money(n: number) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: exampleBusiness.currency ?? 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Map UI steps (type + intensity) to engine steps (durationHours + multiplier). */
function toEngineSteps(steps: Step[]) {
  return steps.map((s) => {
    const scale = s.intensity / 100;
    const kind = kindOf(s.type);
    return {
      type: s.type,
      durationHours: kind === 'business' ? 1 : Math.max(1, Math.round(1 + scale * 23)),
      params: kind === 'traffic' ? { multiplier: Math.round(10 + scale * 240) } : {},
    };
  });
}

export default function ScenariosPage() {
  const { token, hydrated } = useAuth();
  const qc = useQueryClient();

  const [steps, setSteps] = useState<Step[]>([
    { type: 'aws_down', intensity: 70 },
    { type: 'traffic_100x', intensity: 80 },
  ]);
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');

  const result = useMemo(
    () => runScenario(exampleGraph, { steps: toEngineSteps(steps) }, exampleBusiness),
    [steps],
  );

  const projects = useQuery({ queryKey: ['projects'], queryFn: api.listProjects, enabled: Boolean(token) });
  const activeProject = projectId || projects.data?.[0]?.id || '';
  const saved = useQuery({
    queryKey: ['scenarios', activeProject],
    queryFn: () => api.listScenarios(activeProject),
    enabled: Boolean(token && activeProject),
  });

  const save = useMutation({
    mutationFn: () =>
      api.createScenario(activeProject, {
        name: name.trim() || 'Untitled scenario',
        prompt: steps.map((s) => SIM_TYPES.find((t) => t.type === s.type)?.label).join(' + '),
        steps: toEngineSteps(steps),
        business: exampleBusiness,
      }),
    onSuccess: () => {
      setName('');
      qc.invalidateQueries({ queryKey: ['scenarios', activeProject] });
    },
  });

  const [ranResults, setRanResults] = useState<Record<string, { worstImpact: string; totalRevenueImpact: number; currency: string }>>({});
  const runSaved = useMutation({
    mutationFn: (id: string) => api.runScenario(activeProject, id),
    onSuccess: (res, id) => setRanResults((r) => ({ ...r, [id]: res })),
  });

  const addStep = () => setSteps((s) => [...s, { type: 'dns', intensity: 60 }]);
  const removeStep = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<Step>) =>
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));

  return (
    <>
      <PageHeader
        title="Scenario Laboratory"
        subtitle="Compose multiple failures into one what-if experiment and quantify the combined impact."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        {/* Builder */}
        <Card title="Build a scenario">
          <div className="space-y-3">
            {steps.map((step, i) => {
              const kind = kindOf(step.type);
              const eng = toEngineSteps([step])[0];
              return (
                <div key={i} className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={step.type}
                      onChange={(e) => update(i, { type: e.target.value as SimulationType })}
                      className="flex-1 rounded-md border border-border bg-secondary px-2 py-1.5 text-sm text-foreground"
                    >
                      {SIM_TYPES.map((t) => (
                        <option key={t.type} value={t.type}>{t.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeStep(i)}
                      className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-destructive"
                      aria-label="Remove step"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range" min={10} max={100} value={step.intensity}
                      onChange={(e) => update(i, { intensity: Number(e.target.value) })}
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
                    />
                    <span className="w-14 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {kind === 'traffic' ? `${eng.params.multiplier}×` : kind === 'business' ? `${step.intensity}%` : `${eng.durationHours}h`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={addStep}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-ring/40 hover:text-foreground"
          >
            <Plus className="size-4" /> Add failure step
          </button>

          {/* Save */}
          <div className="mt-5 border-t border-border pt-4">
            {!hydrated ? null : !token ? (
              <p className="text-xs text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">Sign in</Link> to save scenarios to a project.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Scenario name"
                  className="min-w-40 flex-1 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                />
                {projects.data && projects.data.length > 0 && (
                  <select
                    value={activeProject}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="rounded-md border border-border bg-secondary px-2 py-1.5 text-sm text-foreground"
                  >
                    {projects.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                <button
                  onClick={() => save.mutate()}
                  disabled={save.isPending || !activeProject}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save
                </button>
              </div>
            )}
            {!token && null}
            {token && !activeProject && (
              <p className="mt-2 text-xs text-muted-foreground">
                Create a project first on the <Link href="/projects" className="text-primary hover:underline">Projects</Link> page.
              </p>
            )}
          </div>
        </Card>

        {/* Live impact */}
        <Card title="Projected combined impact">
          <div className="flex items-center justify-between">
            <SeverityBadge severity={IMPACT_SEV[result.worstImpact]} />
            <span className="text-xs text-muted-foreground">{steps.length} steps · worst case</span>
          </div>
          <div className="mt-4">
            <span className="font-mono text-4xl font-semibold tabular-nums text-destructive">
              {money(result.totalRevenueImpact)}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">total business impact</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {result.affectedNodeIds.length} component(s) affected across all steps
          </div>

          <div className="mt-5 space-y-2">
            {result.steps.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2 text-sm">
                <span className="capitalize text-foreground">{s.step.type.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={IMPACT_SEV[s.result.impact]} />
                  <span className="w-24 text-right font-mono text-xs tabular-nums text-destructive">
                    {s.revenue ? money(s.revenue.totalImpact) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Saved scenarios */}
      {token && activeProject && (
        <Card title="Saved scenarios" className="mt-6">
          {saved.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {saved.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No saved scenarios yet — build one above and hit Save.</p>
          )}
          <ul className="space-y-2">
            {saved.data?.map((sc) => {
              const ran = ranResults[sc.id];
              return (
                <li key={sc.id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{sc.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{sc.prompt}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {ran && (
                      <span className="font-mono text-xs tabular-nums text-destructive">
                        {new Intl.NumberFormat('en', { style: 'currency', currency: ran.currency, maximumFractionDigits: 0 }).format(ran.totalRevenueImpact)}
                      </span>
                    )}
                    <button
                      onClick={() => runSaved.mutate(sc.id)}
                      disabled={runSaved.isPending && runSaved.variables === sc.id}
                      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:border-primary disabled:opacity-50"
                    >
                      {runSaved.isPending && runSaved.variables === sc.id
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <Play className="size-3.5" />}
                      Run
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
