'use client'

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
} from 'lucide-react'
import { SeverityBadge } from '@/components/ui/severity'
import { ActionButton } from '@/components/layout/screen-header'
import type { Risk } from '@/lib/riscly-data'
import { useRemediationPr } from '@/lib/use-project-data'

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

  function askAi() {
    const q = `I'm looking at the risk "${risk.title}". ${risk.description} What's the business impact and exactly how do I fix it?`
    router.push(`/assistant?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="flex h-full w-full flex-col bg-panel">
      {/* header */}
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <SeverityBadge severity={risk.severity} />
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
        <ActionButton
          variant="primary"
          className="w-full justify-center"
          onClick={remediation.open}
          disabled={!remediation.canOpen || remediation.busy}
          title="Open a pull request on your connected repo with a remediation plan for these risks"
        >
          {remediation.busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <GitPullRequestArrow className="size-3.5" />
          )}
          {remediation.busy ? 'Opening PR…' : 'Open PR'}
        </ActionButton>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton className="justify-center" onClick={askAi}>
            <Bot className="size-3.5" />
            Ask AI
          </ActionButton>
          <ActionButton
            className="justify-center"
            disabled
            title="Direct one-click code fixes need line-level analysis — coming soon. Use Ask AI or Open PR for now."
          >
            <WandSparkles className="size-3.5" />
            Apply fix
          </ActionButton>
        </div>
      </div>
    </div>
  )
}
