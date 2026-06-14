import { reliabilityScore, securitySimulation, exampleGraph } from '@failsafe/shared';
import { PageHeader, Card, SeverityBadge } from '@/components/ui';

const PROJECTS = [
  { name: 'Acme SaaS', env: 'production', graph: exampleGraph },
];

export default function ProjectsPage() {
  return (
    <>
      <PageHeader title="Projects" subtitle="Connected systems under analysis." />
      <div className="grid grid-cols-2 gap-4">
        {PROJECTS.map((p) => {
          const reliability = reliabilityScore(p.graph);
          const security = securitySimulation(p.graph);
          const worst = reliability.findings[0];
          return (
            <Card key={p.name} title={p.name}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">{p.env}</span>
                <div className="flex gap-4 text-sm">
                  <span>
                    Reliability{' '}
                    <span className="font-semibold text-white">
                      {reliability.score}
                    </span>
                  </span>
                  <span>
                    Security{' '}
                    <span className="font-semibold text-white">
                      {security.score}
                    </span>
                  </span>
                </div>
              </div>
              {worst && (
                <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-300">{worst.title}</span>
                  <SeverityBadge severity={worst.severity} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
