'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  WandSparkles,
  GitPullRequestArrow,
  FileCode,
  Boxes,
  TriangleAlert,
  Bot,
  BookOpen,
  Loader2,
  TrendingDown,
  ExternalLink,
  CircleCheck,
} from 'lucide-react'
import { SeverityBadge, ConfidenceBadge } from '@/components/ui/severity'
import { ActionButton } from '@/components/layout/screen-header'
import type { Risk } from '@/lib/riscly-data'
import { api } from '@/lib/api'
import { useActiveProject, useRemediationPr } from '@/lib/use-project-data'

function Section({
  label,
  icon,
  children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-border px-4 py-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      {children}
    </div>
  )
}

export function RiskInspector({
  risk,
  onClose,
}: {
  risk: Risk
  onClose?: () => void
}) {
  const router = useRouter()
  const remediation = useRemediationPr()
  const { projectId } = useActiveProject()

  // A code-located finding (file + rule) can get a real AI code fix that we
  // commit directly to the repo. The repo is resolved server-side if not on the
  // finding.
  const canFix = Boolean(projectId && risk.file && risk.rule)
  const [fix, setFix] = useState<{ fixed: string | null; explanation: string | null; aiEnabled: boolean } | null>(null)
  const [fixBusy, setFixBusy] = useState(false)
  const [commitUrl, setCommitUrl] = useState<string | null>(null)
  const [committed, setCommitted] = useState(false)
  const [applyBusy, setApplyBusy] = useState(false)
  const [fixError, setFixError] = useState<string | null>(null)

  const fixBody = () => ({
    ...(risk.repo ? { repo: risk.repo } : {}),
    file: risk.file as string,
    line: risk.line,
    rule: risk.rule as string,
    title: risk.title,
    description: risk.description,
  })

  async function viewFix() {
    if (!projectId || !canFix) return
    setFixBusy(true)
    setFixError(null)
    try {
      setFix(await api.codeFix(projectId, fixBody()))
    } catch (e) {
      setFixError((e as Error).message)
    } finally {
      setFixBusy(false)
    }
  }

  async function applyFix() {
    if (!projectId || !canFix) return
    setApplyBusy(true)
    setFixError(null)
    try {
      const r = await api.codeFixCommit(projectId, fixBody())
      setCommitUrl(r.url)
      setCommitted(true)
    } catch (e) {
      setFixError((e as Error).message)
    } finally {
      setApplyBusy(false)
    }
  }

  function askAi() {
    const q = `I'm looking at the risk "${risk.title}". ${risk.description} What's the business impact and exactly how do I fix it?`
    router.push(`/assistant?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="flex h-full w-full flex-col bg-panel">
      {/* header */}
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <SeverityBadge severity={risk.severity} />
            <ConfidenceBadge confidence={risk.confidence} />
            <span className="font-mono text-[11px] text-muted-foreground">
              {risk.id}
            </span>
          </div>
          <h3 className="text-sm font-semibold leading-snug text-pretty">
            {risk.title}
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close inspector"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {risk.description && (
          <Section label="Description">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {risk.description}
            </p>
          </Section>
        )}

        {risk.impact && (
          <Section
            label="Impact analysis"
            icon={<TriangleAlert className="size-3 text-high" />}
          >
            <p className="text-xs leading-relaxed text-muted-foreground">
              {risk.impact}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {risk.exploitAvailable && (
                <span className="rounded-sm bg-critical/15 px-1.5 py-0.5 font-mono text-[10px] text-critical">
                  exploit available
                </span>
              )}
              {risk.inProduction && (
                <span className="rounded-sm bg-high/15 px-1.5 py-0.5 font-mono text-[10px] text-high">
                  in production
                </span>
              )}
              <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {risk.category}
              </span>
            </div>
          </Section>
        )}

        {risk.components.length > 0 && (
          <Section label="Affected components" icon={<Boxes className="size-3" />}>
            <div className="flex flex-wrap gap-1.5">
              {risk.components.map((c) => (
                <span
                  key={c}
                  className="rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-[11px]"
                >
                  {c}
                </span>
              ))}
            </div>
          </Section>
        )}

        {risk.file && (
          <Section label="Code location" icon={<FileCode className="size-3" />}>
            <div className="flex items-center justify-between rounded-sm border border-border bg-background px-2 py-1.5 font-mono text-[11px]">
              <span className="truncate">{risk.file}</span>
              <span className="text-primary">:{risk.line}</span>
            </div>
            {risk.rule && (
              <div className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                rule: {risk.rule}
              </div>
            )}
          </Section>
        )}

        {risk.fix && (
          <Section
            label="Recommended fix"
            icon={<WandSparkles className="size-3 text-primary" />}
          >
            <p className="rounded-sm border border-primary/20 bg-primary/5 p-2 text-xs leading-relaxed text-foreground/90">
              {risk.fix}
            </p>
            {typeof risk.riskReductionPct === 'number' && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-sm bg-ok/10 px-1.5 py-0.5 font-mono text-[10px] text-ok">
                <TrendingDown className="size-3" />~{risk.riskReductionPct}% risk
                if fixed
              </div>
            )}
          </Section>
        )}

        {fix && (
          <Section label="AI code fix" icon={<WandSparkles className="size-3 text-primary" />}>
            {fix.explanation && (
              <p className="mb-2 text-xs leading-relaxed text-foreground/90">{fix.explanation}</p>
            )}
            {fix.fixed ? (
              <pre className="max-h-56 overflow-auto rounded-md bg-muted p-2 font-mono text-[11px] leading-relaxed">
                {fix.fixed}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground">
                {fix.aiEnabled
                  ? 'No automated fix could be generated for this finding — apply the recommended fix manually.'
                  : 'AI fixes are not enabled on this server (set ANTHROPIC_API_KEY).'}
              </p>
            )}
          </Section>
        )}

        {risk.references && risk.references.length > 0 && (
          <Section label="References" icon={<BookOpen className="size-3" />}>
            <ul className="space-y-1.5">
              {risk.references.map((r) => (
                <li key={r.url}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-primary" />
                    <span>
                      <span className="text-foreground/90">{r.title}</span>
                      <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                        · {r.source}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {/* sticky actions */}
      <div className="shrink-0 space-y-2 border-t border-border p-3">
        {canFix ? (
          committed ? (
            // Done — pushed directly to the repo.
            <div className="flex items-center justify-center gap-1.5 rounded-md border border-ok/30 bg-ok/10 px-2.5 py-2 text-xs font-medium text-ok">
              <CircleCheck className="size-3.5" /> Fix pushed to your repo
            </div>
          ) : !fix ? (
            // Step 1: generate & explain the fix.
            <ActionButton
              variant="primary"
              className="w-full justify-center"
              onClick={viewFix}
              disabled={fixBusy}
              title="Generate the AI code fix and explain the exact change"
            >
              {fixBusy ? <Loader2 className="size-3.5 animate-spin" /> : <WandSparkles className="size-3.5" />}
              {fixBusy ? 'Generating fix…' : 'View fix'}
            </ActionButton>
          ) : (
            // Step 2: apply by committing directly (no PR to manage).
            <ActionButton
              variant="primary"
              className="w-full justify-center"
              onClick={applyFix}
              disabled={applyBusy || !fix.fixed}
              title="Commit this fix directly to your repo"
            >
              {applyBusy ? <Loader2 className="size-3.5 animate-spin" /> : <WandSparkles className="size-3.5" />}
              {applyBusy ? 'Pushing fix…' : 'Apply fix — push to repo'}
            </ActionButton>
          )
        ) : (
          // No code location (infra/topology) → a remediation-plan PR.
          <ActionButton
            variant="primary"
            className="w-full justify-center"
            onClick={remediation.open}
            disabled={!remediation.canOpen || remediation.busy}
            title="Open a pull request on your connected repo with a remediation plan"
          >
            {remediation.busy ? <Loader2 className="size-3.5 animate-spin" /> : <GitPullRequestArrow className="size-3.5" />}
            {remediation.busy ? 'Opening PR…' : 'Open remediation PR'}
          </ActionButton>
        )}

        {commitUrl && (
          <a
            href={commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-3.5" /> View commit
          </a>
        )}
        {(fixError || remediation.error) && (
          <p className="text-[11px] text-destructive">{fixError ?? remediation.error}</p>
        )}

        <ActionButton className="w-full justify-center" onClick={askAi}>
          <Bot className="size-3.5" />
          Ask AI
        </ActionButton>
      </div>
    </div>
  )
}
