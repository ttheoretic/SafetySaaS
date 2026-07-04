'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  WandSparkles,
  FileCode,
  Boxes,
  TriangleAlert,
  Bot,
  BookOpen,
  Loader2,
  TrendingDown,
  ExternalLink,
  CircleCheck,
  ArrowLeft,
} from 'lucide-react'
import { SeverityBadge, ConfidenceBadge } from '@/components/ui/severity'
import { ActionButton } from '@/components/layout/screen-header'
import { Markdown } from '@/components/ui/markdown'
import type { Risk } from '@/lib/riscly-data'
import { api } from '@/lib/api'
import { useActiveProject, useTriage } from '@/lib/use-project-data'
import { track } from '@/lib/analytics'
import { TRIAGE_LABEL, type TriageStatus } from '@riscly/shared'
import { cn } from '@/lib/utils'

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

type Fix = { original?: string; fixed: string | null; explanation: string | null; aiEnabled: boolean }

// Datadog-style: the panel carries a colored top edge matching the severity.
const sevEdge: Record<string, string> = {
  critical: 'bg-critical',
  high: 'bg-high',
  medium: 'bg-medium',
  low: 'bg-low',
}

export function RiskInspector({
  risk,
  onClose,
}: {
  risk: Risk
  onClose?: () => void
}) {
  const router = useRouter()
  const { projectId } = useActiveProject()
  const triage = useTriage(projectId)
  const triageStatus = triage.statusFor(risk.fingerprint)

  // A code-located finding (file + rule) can get a real AI code fix that we
  // commit directly to the repo. The repo is resolved server-side if not on the
  // finding.
  const canFix = Boolean(projectId && risk.file && risk.rule)
  const [view, setView] = useState<'detail' | 'fix'>('detail')
  const [fix, setFix] = useState<Fix | null>(null)
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
      setView('fix')
      track('ai_fix_generated', { rule: risk.rule })
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

  // ---- Fix view: takes over the whole right panel ----
  if (view === 'fix') {
    return (
      <div className="flex h-full w-full flex-col bg-panel">
        <span className={cn('h-[3px] w-full shrink-0', sevEdge[risk.severity] ?? 'bg-border')} />
        <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-start gap-2">
            <button
              onClick={() => setView('detail')}
              className="mt-0.5 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Back to details"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <WandSparkles className="size-3" /> Suggested fix
              </div>
              <h3 className="text-sm font-semibold leading-snug text-pretty">{risk.title}</h3>
            </div>
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
          {risk.file && (
            <Section label="Location" icon={<FileCode className="size-3" />}>
              <div className="flex items-center justify-between rounded-sm border border-border bg-background px-2 py-1.5 font-mono text-[11px]">
                <span className="truncate">{risk.file}</span>
                {typeof risk.line === 'number' && <span className="text-primary">:{risk.line}</span>}
              </div>
            </Section>
          )}

          <Section label="What's wrong" icon={<TriangleAlert className="size-3 text-high" />}>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {risk.description || risk.impact || 'See the explanation below.'}
            </p>
          </Section>

          <Section label="How to fix it" icon={<WandSparkles className="size-3 text-primary" />}>
            {fix?.explanation ? (
              <div className="text-xs leading-relaxed text-foreground/90">
                <Markdown content={fix.explanation} />
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {fix?.aiEnabled === false
                  ? 'AI fixes are not enabled on this server (set ANTHROPIC_API_KEY). Apply the recommended fix below manually.'
                  : 'No explanation was generated for this finding.'}
              </p>
            )}
          </Section>

          {fix?.original && (
            <Section label="Current code" icon={<FileCode className="size-3 text-high" />}>
              <pre className="max-h-72 overflow-auto rounded-md border border-border bg-background p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {fix.original}
              </pre>
            </Section>
          )}

          {fix?.fixed && (
            <Section label="Fixed code" icon={<CircleCheck className="size-3 text-ok" />}>
              <pre className="max-h-96 overflow-auto rounded-md border border-ok/30 bg-ok/5 p-2.5 font-mono text-[11px] leading-relaxed text-foreground/90">
                {fix.fixed}
              </pre>
            </Section>
          )}

          {risk.fix && (
            <Section label="Recommended approach" icon={<WandSparkles className="size-3 text-primary" />}>
              <p className="rounded-sm border border-primary/20 bg-primary/5 p-2 text-xs leading-relaxed text-foreground/90">
                {risk.fix}
              </p>
            </Section>
          )}

          {risk.references && risk.references.length > 0 && (
            <Section label="Tips & resources" icon={<BookOpen className="size-3" />}>
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
                        <span className="ml-1 font-mono text-[10px] text-muted-foreground">· {r.source}</span>
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
          {committed ? (
            <div className="flex items-center justify-center gap-1.5 rounded-md border border-ok/30 bg-ok/10 px-2.5 py-2 text-xs font-medium text-ok">
              <CircleCheck className="size-3.5" /> Fix pushed to your repo
            </div>
          ) : (
            <ActionButton
              variant="primary"
              className="w-full justify-center"
              onClick={applyFix}
              disabled={applyBusy || !fix?.fixed}
              title="Commit this fix directly to your repo"
            >
              {applyBusy ? <Loader2 className="size-3.5 animate-spin" /> : <WandSparkles className="size-3.5" />}
              {applyBusy ? 'Pushing fix…' : 'Apply fix — push to repo'}
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
          {fixError && <p className="text-[11px] text-destructive">{fixError}</p>}

          <ActionButton className="w-full justify-center" onClick={askAi}>
            <Bot className="size-3.5" />
            Ask AI
          </ActionButton>
        </div>
      </div>
    )
  }

  // ---- Detail view ----
  return (
    <div className="flex h-full w-full flex-col bg-panel">
      <span className={cn('h-[3px] w-full shrink-0', sevEdge[risk.severity] ?? 'bg-border')} />
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
        {committed ? (
          // Code fix already pushed directly to the repo.
          <div className="flex items-center justify-center gap-1.5 rounded-md border border-ok/30 bg-ok/10 px-2.5 py-2 text-xs font-medium text-ok">
            <CircleCheck className="size-3.5" /> Fix pushed to your repo
          </div>
        ) : canFix ? (
          // Code finding → open the full fix view (explanation + code + apply).
          <ActionButton
            variant="primary"
            className="w-full justify-center"
            onClick={viewFix}
            disabled={fixBusy}
            title="See the fix, why it works, and apply it with one click"
          >
            {fixBusy ? <Loader2 className="size-3.5 animate-spin" /> : <WandSparkles className="size-3.5" />}
            {fixBusy ? 'Generating fix…' : 'View fix'}
          </ActionButton>
        ) : null}

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
        {fixError && <p className="text-[11px] text-destructive">{fixError}</p>}

        {projectId && (
          <TriageBar
            status={triageStatus}
            busy={triage.setTriage.isPending}
            onSet={(status) =>
              risk.fingerprint && triage.setTriage.mutate({ fingerprint: risk.fingerprint, status })
            }
          />
        )}

        <ActionButton className="w-full justify-center" onClick={askAi}>
          <Bot className="size-3.5" />
          Ask AI
        </ActionButton>
      </div>
    </div>
  )
}

const TRIAGE_OPTIONS: TriageStatus[] = ['open', 'false_positive', 'accepted_risk', 'resolved']

/** Lets the user triage a finding (false positive / accepted risk / resolved);
 *  the decision persists across re-scans and silences alerts. */
function TriageBar({
  status,
  onSet,
  busy,
}: {
  status: TriageStatus
  onSet: (s: TriageStatus) => void
  busy: boolean
}) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Triage
        </span>
        {busy && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {TRIAGE_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSet(s)}
            disabled={busy}
            className={cn(
              'rounded-sm border px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50',
              s === status
                ? s === 'open'
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-ok/40 bg-ok/10 text-ok'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {TRIAGE_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  )
}
