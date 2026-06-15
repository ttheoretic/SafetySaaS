import { buildReport, exampleGraph, exampleBusiness } from '@failsafe/shared';
import { PageHeader, Card, SeverityBadge } from '@/components/ui';

const REPORTS = [
  { type: 'executive', label: 'Executive Report', desc: 'High-level risk & revenue summary for leadership.' },
  { type: 'cto', label: 'CTO Report', desc: 'Architecture, SPOFs, scaling cliffs and the fix roadmap.' },
  { type: 'security', label: 'Security Report', desc: 'Attack exposure, findings and remediations.' },
  { type: 'full', label: 'Full Report', desc: 'Everything: reliability, simulations, predictions, security.' },
] as const;

export default function ReportsPage() {
  // Live preview of the Executive report, rendered from the shared engine.
  // The API serves the same content as JSON / HTML / downloadable PDF at
  // GET /api/projects/:id/reports/:type?format=pdf
  const preview = buildReport(exampleGraph, exampleBusiness, 'executive');

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Generate Executive / CTO / Security / Full reports as JSON, HTML or PDF from the latest scan."
      />
      <div className="mb-6 grid grid-cols-2 gap-4">
        {REPORTS.map((r) => (
          <Card key={r.type} title={r.label}>
            <p className="text-sm text-muted">{r.desc}</p>
            <div className="mt-3 flex gap-2 text-xs">
              <span className="rounded-md border border-border bg-panel2 px-2 py-1">JSON</span>
              <span className="rounded-md border border-border bg-panel2 px-2 py-1">HTML</span>
              <span className="rounded-md bg-accent px-2 py-1 text-white">PDF</span>
            </div>
          </Card>
        ))}
      </div>

      <Card title={`Preview · ${preview.title}`}>
        <div className="mb-3 text-xs text-muted">Generated from the latest scan</div>
        {preview.sections.map((section) => (
          <div key={section.heading} className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-white">{section.heading}</h3>
            <ul className="space-y-1 text-sm">
              {section.lines.map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  {line.severity ? (
                    <SeverityBadge severity={line.severity} />
                  ) : (
                    line.label && <span className="text-muted">{line.label}:</span>
                  )}
                  <span className="text-slate-300">{line.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Card>
    </>
  );
}
