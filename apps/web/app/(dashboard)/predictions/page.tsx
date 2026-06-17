'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Loader2, Cpu } from 'lucide-react';
import { predictFailures, exampleGraph, exampleBusiness } from '@riscly/shared';
import { PageHeader, Card, SeverityBadge } from '@/components/ui';
import { AiChat } from '@/components/dashboard/ai-chat';
import { useAuth } from '@/lib/auth-store';
import { usePlan } from '@/lib/use-plan';
import { api, type PredictionResponse } from '@/lib/api';

const CATEGORY_LABEL: Record<string, string> = {
  bottleneck: 'Bottleneck',
  scaling: 'Scaling',
  architecture: 'Architecture',
  security: 'Security',
};

const TIER_LABEL: Record<string, string> = {
  basic: 'Basis AI (Haiku 4.5)',
  sonnet: 'Claude Sonnet 4.6',
  opus: 'Claude Opus 4.8',
};

type Prediction = PredictionResponse['predictions'][number];

export default function PredictionsPage() {
  const { token } = useAuth();
  const { limits } = usePlan();
  const [live, setLive] = useState<PredictionResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: api.listProjects,
    enabled: Boolean(token),
  });
  const projectId = projects.data?.[0]?.id;

  // Baseline: the deterministic heuristic layer, always available.
  const heuristics = predictFailures(exampleGraph, {
    currentUsers: exampleBusiness.activeUsers,
  }) as unknown as Prediction[];
  const predictions: Prediction[] = live?.predictions ?? heuristics;

  const tier = live?.tier ?? limits.aiTier;

  async function runLive() {
    if (!projectId) {
      setError('Create a project on the Projects page first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setLive(await api.tenantPredict(projectId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="AI Predictions"
        subtitle="Likely future bottlenecks, scaling cliffs and risks — found before they happen. Ask the assistant anything about your system."
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Cpu className="size-4 text-primary" />
          AI model on your plan:{' '}
          <span className="font-medium text-foreground">{TIER_LABEL[tier] ?? tier}</span>
        </div>
        {token && (
          <button
            onClick={runLive}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Run live AI prediction
          </button>
        )}
      </div>
      {error && <p className="mb-3 text-sm text-warning">{error}</p>}
      {live && (
        <p className="mb-3 text-xs text-muted-foreground">
          {live.aiEnabled
            ? `Augmented with ${TIER_LABEL[live.tier] ?? live.tier}.`
            : 'AI provider not configured on the server — showing heuristic predictions only.'}
        </p>
      )}

      <div className="space-y-3">
        {predictions.map((p) => (
          <Card key={p.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{p.title}</span>
                  <SeverityBadge severity={p.severity} />
                  {p.source === 'ai' && (
                    <span className="rounded-md border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      AI
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">{p.rationale}</p>
                <p className="mt-2 text-sm">
                  <span className="text-accent">Fix:</span>{' '}
                  <span className="text-slate-300">{p.recommendation}</span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="rounded-md border border-border bg-panel2 px-3 py-1.5 text-xs">
                  <span className="text-muted">{CATEGORY_LABEL[p.category] ?? p.category}</span>
                </div>
                <div className="mt-2 text-xs text-warn">{p.horizon}</div>
                <div className="mt-1 text-xs text-muted">
                  {Math.round(p.likelihood * 100)}% likely
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
        </div>

        <div className="xl:sticky xl:top-4">
          <AiChat projectId={projectId} />
        </div>
      </div>
    </>
  );
}
