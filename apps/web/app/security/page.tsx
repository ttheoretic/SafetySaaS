import { securitySimulation, exampleGraph } from '@failsafe/shared';
import { PageHeader, Card, ScoreGauge, SeverityBadge } from '@/components/ui';

export default function SecurityPage() {
  const result = securitySimulation(exampleGraph);

  return (
    <>
      <PageHeader
        title="Security Simulation"
        subtitle="Simulated attack exposure: DDoS, credential stuffing, API abuse, brute force, session hijacking."
      />
      <div className="grid grid-cols-3 gap-4">
        <Card className="flex items-center justify-center">
          <ScoreGauge score={result.score} label="security" />
        </Card>
        <Card title="Attack exposure" className="col-span-2">
          <ul className="grid grid-cols-2 gap-2">
            {result.exposures.map((e) => (
              <li
                key={e.attack}
                className="flex items-center justify-between rounded-md border border-border bg-panel2 px-3 py-2 text-sm"
              >
                <span className="capitalize">{e.attack.replace(/_/g, ' ')}</span>
                <span
                  className={
                    e.exposed ? 'text-bad font-medium' : 'text-good font-medium'
                  }
                >
                  {e.exposed ? 'Exposed' : 'Protected'}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Security findings" className="mt-6">
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
    </>
  );
}
