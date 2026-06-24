'use client'

import { useState } from 'react'
import { FileText, Download, Loader2, FileJson, Boxes } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { useActiveProject, downloadReport } from '@/lib/use-project-data'
import { cn } from '@/lib/utils'

export function ReportsView() {
  const { projectId } = useActiveProject()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (type: string) => {
    if (!projectId || busy) return
    setBusy(type)
    setError(null)
    try {
      await downloadReport(projectId, type, 'pdf')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Reports & Export"
        subtitle="Share your posture with stakeholders and auditors"
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl">
          {!projectId && (
            <p className="mb-3 rounded-md border border-medium/30 bg-medium/10 px-3 py-2 text-xs text-foreground">
              Select a repository to generate its report.
            </p>
          )}

          <div className="flex flex-col gap-3">
            <ReportCard
              icon={<FileText className="size-4" />}
              title="Full posture report"
              desc="Executive PDF: risk score, findings by severity, architecture and recommendations from the latest scan."
              action="Download PDF"
              busy={busy === 'full'}
              disabled={!projectId}
              onClick={() => run('full')}
            />
            <ReportCard
              icon={<FileText className="size-4" />}
              title="Security summary"
              desc="A focused PDF of security findings and their remediation."
              action="Download PDF"
              busy={busy === 'security'}
              disabled={!projectId}
              onClick={() => run('security')}
            />
            <ReportCard
              icon={<FileJson className="size-4" />}
              title="SARIF export"
              desc="Findings in SARIF — drop into the GitHub Security tab or any SARIF viewer."
              action="Soon"
              soon
            />
            <ReportCard
              icon={<Boxes className="size-4" />}
              title="SBOM export"
              desc="CycloneDX bill of materials. Available now on the Dependencies / SBOM page."
              action="Open SBOM"
              href="/inventory/sbom"
            />
          </div>

          {error && <p className="mt-3 text-[11px] text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  )
}

function ReportCard({
  icon,
  title,
  desc,
  action,
  busy,
  disabled,
  soon,
  href,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  action: string
  busy?: boolean
  disabled?: boolean
  soon?: boolean
  href?: string
  onClick?: () => void
}) {
  const btnClass = cn(
    'inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium',
    soon
      ? 'cursor-default border border-border text-muted-foreground'
      : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50',
  )
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-panel p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {href ? (
        <a href={href} className={btnClass}>
          <Download className="size-3.5" /> {action}
        </a>
      ) : (
        <button onClick={onClick} disabled={disabled || soon || busy} className={btnClass}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : !soon && <Download className="size-3.5" />}
          {action}
        </button>
      )}
    </div>
  )
}
