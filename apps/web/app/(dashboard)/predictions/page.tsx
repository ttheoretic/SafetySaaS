import { predictFailures, exampleGraph, exampleBusiness } from '@riscly/shared';
import { PageHeader, Card, SeverityBadge } from '@/components/ui';

const CATEGORY_LABEL: Record<string, string> = {
  bottleneck: 'Bottleneck',
  scaling: 'Scaling',
  architecture: 'Architecture',
  security: 'Security',
};

export default function PredictionsPage() {
  // The dashboard renders the deterministic heuristic layer directly. The API's
  // /analyze/predict endpoint additionally augments these with Claude when an
  // ANTHROPIC_API_KEY is configured.
  const predictions = predictFailures(exampleGraph, {
    currentUsers: exampleBusiness.activeUsers,
  });

  return (
    <>
      <PageHeader
        title="AI Failure Prediction"
        subtitle="Likely future bottlenecks, scaling cliffs and risks — found before they happen."
      />
      <div className="space-y-3">
        {predictions.map((p) => (
          <Card key={p.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{p.title}</span>
                  <SeverityBadge severity={p.severity} />
                </div>
                <p className="mt-1 text-sm text-muted">{p.rationale}</p>
                <p className="mt-2 text-sm">
                  <span className="text-accent">Fix:</span>{' '}
                  <span className="text-slate-300">{p.recommendation}</span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="rounded-md border border-border bg-panel2 px-3 py-1.5 text-xs">
                  <span className="text-muted">{CATEGORY_LABEL[p.category]}</span>
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
    </>
  );
}
