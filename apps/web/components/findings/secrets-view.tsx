'use client'

import { useMemo } from 'react'
import { KeyRound, ShieldCheck, FileCode } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { SeverityBadge } from '@/components/ui/severity'
import { severityOrder, type Severity } from '@/lib/riscly-data'
import { useCodeIssues } from '@/lib/use-project-data'

/** Committed secrets & credentials surfaced by the code audit (secret/* rules). */
export function SecretsView() {
  const { files, loading } = useCodeIssues()

  const secrets = useMemo(() => {
    const out = files
      .flatMap((f) => f.issues.map((i) => ({ ...i, repo: f.repo })))
      .filter((i) => i.rule.startsWith('secret'))
    return out.sort(
      (a, b) =>
        severityOrder[a.severity as Severity] - severityOrder[b.severity as Severity],
    )
  }, [files])

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Secrets"
        subtitle={`${secrets.length} committed secret${secrets.length === 1 ? '' : 's'} detected`}
      />

      {secrets.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-ok/10 text-ok">
              {loading ? <KeyRound className="size-5 animate-pulse" /> : <ShieldCheck className="size-5" />}
            </div>
            <p className="text-sm font-medium">
              {loading ? 'Scanning for secrets…' : 'No committed secrets found'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading
                ? 'Reading the latest scan.'
                : 'Riscly scans committed files for API keys, tokens, private keys and credential files. Verified history scanning lands with the dedicated secrets engine.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-4xl divide-y divide-border overflow-hidden rounded-md border border-border">
            {secrets.map((s) => (
              <div key={s.id} className="flex items-start gap-3 bg-panel px-3 py-3">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-critical" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={s.severity as Severity} />
                    <span className="text-sm font-medium">{s.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                    <FileCode className="size-3 shrink-0" />
                    <span className="truncate">
                      {s.repo ? `${s.repo} · ` : ''}
                      {s.file}:{s.line}
                    </span>
                    <span className="rounded-sm bg-muted px-1 text-muted-foreground/80">{s.rule}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
