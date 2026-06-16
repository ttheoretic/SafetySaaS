'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FileText, FileSpreadsheet, FileJson, Download, Loader2 } from 'lucide-react';
import { buildReport, exampleGraph, exampleBusiness } from '@riscly/shared';
import { PageHeader, Card, SeverityBadge } from '@/components/ui';
import { useAuth } from '@/lib/auth-store';
import { api } from '@/lib/api';

const TYPES = [
  { type: 'executive', label: 'Executive Report', desc: 'High-level risk & revenue summary for leadership.' },
  { type: 'board', label: 'Board Report', desc: 'Concise reliability and exposure briefing for the board.' },
  { type: 'cto', label: 'Engineering Report', desc: 'Architecture, SPOFs, predictions and the fix roadmap.' },
  { type: 'security', label: 'Security Report', desc: 'Attack exposure, findings and remediations.' },
  { type: 'compliance', label: 'Compliance Report', desc: 'Tenant isolation, encryption, audit & access controls.' },
  { type: 'full', label: 'Full Report', desc: 'Everything: reliability, predictions, revenue, security.' },
] as const;

const FORMATS = [
  { fmt: 'pdf', label: 'PDF', icon: FileText, ext: 'pdf' },
  { fmt: 'xls', label: 'Excel', icon: FileSpreadsheet, ext: 'xls' },
  { fmt: 'csv', label: 'CSV', icon: FileSpreadsheet, ext: 'csv' },
  { fmt: 'json', label: 'JSON', icon: FileJson, ext: 'json' },
];

export default function ReportsPage() {
  const { token, hydrated } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const projects = useQuery({ queryKey: ['projects'], queryFn: api.listProjects, enabled: Boolean(token) });
  const [projectId, setProjectId] = useState('');
  const activeProject = projectId || projects.data?.[0]?.id || '';

  const preview = buildReport(exampleGraph, exampleBusiness, 'executive');

  async function download(type: string, fmt: string, ext: string) {
    if (!activeProject) { setError('Create a project on the Projects page first.'); return; }
    const key = `${type}:${fmt}`;
    setBusy(key); setError(null);
    try {
      const blob = await api.downloadReport(activeProject, type, fmt);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${type}-report.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(null); }
  }

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Generate Executive / Board / Engineering / Security / Compliance / Full reports as PDF, Excel, CSV or JSON."
      />

      {hydrated && token && projects.data && projects.data.length > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Project:</span>
          <select value={activeProject} onChange={(e) => setProjectId(e.target.value)}
            className="rounded-md border border-border bg-secondary px-2 py-1 text-foreground">
            {projects.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TYPES.map((r) => (
          <Card key={r.type} title={r.label}>
            <p className="text-sm text-muted-foreground">{r.desc}</p>
            {!hydrated ? null : !token ? (
              <p className="mt-3 text-xs text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">Sign in</Link> to export.
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {FORMATS.map((f) => {
                  const key = `${r.type}:${f.fmt}`;
                  const Icon = f.icon;
                  return (
                    <button key={f.fmt} onClick={() => download(r.type, f.fmt, f.ext)} disabled={busy === key}
                      className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:border-primary disabled:opacity-50">
                      {busy === key ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
                      {f.label}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-warning">{error}</p>}

      <Card title={`Preview · ${preview.title}`} className="mt-6">
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Download className="size-3.5" /> Generated from the latest scan
        </div>
        {preview.sections.map((section) => (
          <div key={section.heading} className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">{section.heading}</h3>
            <ul className="space-y-1 text-sm">
              {section.lines.map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  {line.severity ? <SeverityBadge severity={line.severity} /> : line.label && <span className="text-muted-foreground">{line.label}:</span>}
                  <span className="text-foreground">{line.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Card>
    </>
  );
}
