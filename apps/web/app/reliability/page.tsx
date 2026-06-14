import {
  reliabilityScore,
  buildRecommendations,
  exampleGraph,
} from '@failsafe/shared';
import { PageHeader, Card, ScoreGauge, SeverityBadge, Stat } from '@/components/ui';

export default function ReliabilityPage() {
  const result = reliabilityScore(exampleGraph);
  const recommendations = buildRecommendations(result.findings);

  return (
    <>
      <PageHeader
        title="Reliability Score"
        subtitle="Deterministic 0–100 score derived from the risk findings below."
      />
      <div className="grid grid-cols-4 gap-4">
        <Card className="flex items-center justify-center">
          <ScoreGauge score={result.score} label="reliability" />
        </Card>
        <Stat label="SPOFs" value={result.summary.spofCount} />
        <Stat label="DBs w/o backup" value={result.summary.databasesWithoutBackup} />
        <Stat label="APIs w/o rate limit" value={result.summary.apisWithoutRateLimit} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Card title="Risk findings">
          <ul className="space-y-3">
            {result.findings.map((f, i) => (
              <li key={i} className="border-b border-border pb-3 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white">{f.title}</span>
                  <SeverityBadge severity={f.severity} />
                </div>
                <p className="mt-1 text-sm text-muted">{f.description}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recommendations">
          <ul className="space-y-3">
            {recommendations.map((r, i) => (
              <li key={i} className="border-b border-border pb-3 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white">{r.title}</span>
                  <span className="text-xs text-good">
                    -{r.riskReductionPct}% risk
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{r.fix}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Priority: {r.priority} · Likelihood:{' '}
                  {Math.round(r.probability * 100)}% · {r.businessImpact}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
