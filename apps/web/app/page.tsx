import {
  reliabilityScore,
  securitySimulation,
  exampleGraph,
} from '@failsafe/shared';
import { PageHeader, Card, ScoreGauge, Stat, SeverityBadge } from '@/components/ui';
import { SystemGraphView } from '@/components/SystemGraphView';

export default function OverviewPage() {
  const reliability = reliabilityScore(exampleGraph);
  const security = securitySimulation(exampleGraph);
  const topFindings = reliability.findings.slice(0, 4);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Demo project · Acme SaaS (production)"
      />
      <div className="grid grid-cols-4 gap-4">
        <Card className="flex items-center justify-center" title="Reliability">
          <ScoreGauge score={reliability.score} label="reliability" />
        </Card>
        <Card className="flex items-center justify-center" title="Security">
          <ScoreGauge score={security.score} label="security" />
        </Card>
        <Stat label="Single points of failure" value={reliability.summary.spofCount} />
        <Stat label="Open findings" value={reliability.findings.length} />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card title="System graph" className="col-span-2">
          <SystemGraphView graph={exampleGraph} />
        </Card>
        <Card title="Top risks">
          <ul className="space-y-3">
            {topFindings.map((f, i) => (
              <li key={i} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white">{f.title}</span>
                  <SeverityBadge severity={f.severity} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
