import { PageHeader, Card } from '@/components/ui';

const REPORTS = [
  { type: 'Executive Report', desc: 'High-level risk & revenue summary for leadership.' },
  { type: 'CTO Report', desc: 'Architecture, SPOFs, scaling cliffs and the fix roadmap.' },
  { type: 'Security Report', desc: 'Attack exposure, findings and remediations.' },
  { type: 'Full Report', desc: 'Everything: reliability, simulations, revenue, security.' },
];

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Generate PDF reports from the latest scan. (Rendering pipeline runs as a background job.)"
      />
      <div className="grid grid-cols-2 gap-4">
        {REPORTS.map((r) => (
          <Card key={r.type} title={r.type}>
            <p className="text-sm text-muted">{r.desc}</p>
            <button className="mt-3 rounded-md bg-accent px-3 py-1.5 text-sm text-white">
              Generate PDF
            </button>
          </Card>
        ))}
      </div>
    </>
  );
}
