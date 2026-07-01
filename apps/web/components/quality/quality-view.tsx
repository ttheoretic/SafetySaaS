'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  FileWarning,
  Boxes,
  ListTodo,
  FileCode,
  File,
  FolderOpen,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  WandSparkles,
  Loader2,
} from 'lucide-react'
import { ScreenHeader, ActionButton } from '@/components/layout/screen-header'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { Markdown } from '@/components/ui/markdown'
import { useSystemGraph, useActiveProject } from '@/lib/use-project-data'
import { useRepoFileContent, SourceView } from '@/components/code/code-view'
import { api } from '@/lib/api'
import type { QualityHotspot } from '@riscly/shared'
import { cn } from '@/lib/utils'

const NO_LINES: Set<number> = new Set()

type Band = 'critical' | 'high' | 'medium' | 'low'
function band(score: number): Band {
  return score >= 70 ? 'critical' : score >= 50 ? 'high' : score >= 35 ? 'medium' : 'low'
}
const bandColor: Record<Band, string> = {
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium',
  low: 'text-ok',
}
const bandBar: Record<Band, string> = {
  critical: 'bg-critical',
  high: 'bg-high',
  medium: 'bg-medium',
  low: 'bg-ok',
}
const bandDot: Record<Band, string> = {
  critical: 'bg-critical',
  high: 'bg-high',
  medium: 'bg-medium',
  low: 'bg-ok',
}
const TAG_LABEL: Record<string, string> = {
  'large-file': 'Large file',
  'high-complexity': 'High complexity',
  'deep-nesting': 'Deep nesting',
  todos: 'Unfinished (TODOs)',
}

const QUALITY_RULE = 'quality/maintainability'

function hotspotKey(h: QualityHotspot): string {
  return `${h.repo ?? ''}:${h.file}`
}

function hotspotDescription(h: QualityHotspot): string {
  const tagText = h.tags.map((t) => TAG_LABEL[t] ?? t).join(', ')
  return (
    `This file scores ${h.score}/100 for maintainability risk: ` +
    `${h.loc} lines, branching complexity ${h.complexity}, max nesting ${h.maxNesting}` +
    (h.todos > 0 ? `, ${h.todos} unfinished marker${h.todos === 1 ? '' : 's'} (TODO/FIXME)` : '') +
    (tagText ? `. Flagged for: ${tagText}.` : '.')
  )
}

/**
 * Code Quality / maintainability — "future-problem" signals. Surfaces files
 * that are large, complex, deeply nested or TODO-heavy: code that isn't a
 * security bug today but is likely to cause defects or incidents later.
 *
 * The landing is a ranked hotspot listing. Clicking one drills into the same
 * three-pane coding layout as Code (SAST) — files left, code (with the AI
 * refactor shown in green) in the middle, metrics + explanation + push on the
 * right — with a back link to the listing.
 */
export function QualityView() {
  const { graph } = useSystemGraph()
  const { projectId } = useActiveProject()
  const hotspots = useMemo(() => graph?.qualityHotspots ?? [], [graph])
  const summary = graph?.qualitySummary
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const hasSelection = Boolean(
    selectedKey && projectId && hotspots.some((h) => hotspotKey(h) === selectedKey),
  )

  if (hasSelection && projectId) {
    return (
      <QualityDetailView
        projectId={projectId}
        hotspots={hotspots}
        initialKey={selectedKey!}
        onBack={() => setSelectedKey(null)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Code Quality"
        subtitle="Maintainability hotspots — code likely to cause future problems"
      />

      {hotspots.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <Activity className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">No maintainability hotspots</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Connect a repository and run a scan. Riscly grades each source file for size,
            complexity, nesting and unfinished work, then ranks the riskiest.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {/* summary */}
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={<FileWarning className="size-4 text-high" />} label="Hotspots" value={summary?.hotspotCount ?? 0} hint="files above risk threshold" />
            <Stat icon={<Activity className="size-4 text-medium" />} label="Avg risk score" value={summary?.avgScore ?? 0} hint="of flagged files" />
            <Stat icon={<Boxes className="size-4" />} label="Files graded" value={summary?.filesAnalyzed ?? hotspots.length} />
            <Stat icon={<ListTodo className="size-4" />} label="TODO/FIXME" value={summary?.totalTodos ?? 0} hint="unfinished markers" />
          </div>

          <Panel>
            <PanelHeader title="Maintainability hotspots" icon={<FileCode className="size-3.5 text-primary" />} action={<span className="font-mono text-[11px] text-muted-foreground">{hotspots.length} files</span>} />
            <div className="divide-y divide-border">
              {hotspots.map((h) => {
                const b = band(h.score)
                const key = hotspotKey(h)
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/40"
                  >
                    {/* score */}
                    <div className="flex w-12 shrink-0 flex-col items-center">
                      <span className={cn('font-mono text-lg font-semibold tabular-nums', bandColor[b])}>{h.score}</span>
                      <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                        <div className={cn('h-full rounded-full', bandBar[b])} style={{ width: `${h.score}%` }} />
                      </div>
                    </div>
                    {/* file + metrics */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-[12px]">{h.file}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
                        <span>{h.loc} LOC</span>
                        <span>complexity {h.complexity}</span>
                        <span>nesting {h.maxNesting}</span>
                        {h.todos > 0 && <span>{h.todos} TODO</span>}
                        {h.repo && <span className="truncate">· {h.repo}</span>}
                      </div>
                    </div>
                    {/* tags */}
                    <div className="hidden shrink-0 flex-wrap justify-end gap-1 sm:flex">
                      {h.tags.map((t) => (
                        <span key={t} className="rounded-sm border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {TAG_LABEL[t] ?? t}
                        </span>
                      ))}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
                  </button>
                )
              })}
            </div>
          </Panel>

          <p className="mt-3 px-1 text-[11px] text-muted-foreground">
            Scores combine file size, branching complexity, nesting depth and unfinished-work markers.
            They flag maintainability risk, not security vulnerabilities — high-scoring files are the best
            candidates for refactoring and extra test coverage.
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Three-pane drill-in for a hotspot: files left, source (for reference) in the
 * middle, and — on the right — a targeted, AI-generated refactoring PLAN.
 *
 * Maintainability hotspots are large files, so a whole-file AI rewrite isn't
 * feasible (and often fails). Instead we produce a concrete, prioritized set of
 * steps (extract functions, flatten nesting, resolve TODOs) the developer
 * applies incrementally — the honest way to reduce maintainability risk.
 */
function QualityDetailView({
  projectId,
  hotspots,
  initialKey,
  onBack,
}: {
  projectId: string
  hotspots: QualityHotspot[]
  initialKey: string
  onBack: () => void
}) {
  const [activeKey, setActiveKey] = useState(initialKey)
  const active =
    hotspots.find((h) => hotspotKey(h) === activeKey) ?? hotspots[0]

  const repo = active.repo ?? null
  const fileQuery = useRepoFileContent(projectId, repo, active.file)
  const content = fileQuery.data?.content ?? null

  const [plan, setPlan] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset the plan whenever the selected file changes.
  useEffect(() => {
    setPlan(null)
    setError(null)
  }, [activeKey])

  const b = band(active.score)
  const fileName = active.file.split('/').pop() || active.file

  async function generatePlan() {
    setGenerating(true)
    setError(null)
    setPlan(null)
    try {
      const res = await api.codeRefactor(projectId, {
        ...(repo ? { repo } : {}),
        file: active.file,
        rule: QUALITY_RULE,
        title: `Refactor ${fileName} for maintainability`,
        description: hotspotDescription(active),
      })
      if (res.plan) {
        setPlan(res.plan)
      } else {
        setError(
          res.aiEnabled
            ? 'The AI could not produce a refactoring plan for this file.'
            : 'AI is not enabled on this server (set ANTHROPIC_API_KEY).',
        )
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Code Quality"
        subtitle={`${active.file} · maintainability`}
        actions={
          <ActionButton onClick={onBack}>
            <ArrowLeft className="size-3.5" />
            Back to hotspots
          </ActionButton>
        }
      />

      <div className="flex min-h-0 flex-1">
        {/* hotspot files */}
        <div className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar">
          <div className="flex items-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <FolderOpen className="size-3.5" />
            Hotspot files ({hotspots.length})
          </div>
          {hotspots.map((h) => {
            const key = hotspotKey(h)
            const hb = band(h.score)
            const fname = h.file.split('/').pop() || h.file
            return (
              <button
                key={key}
                onClick={() => setActiveKey(key)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent/50',
                  key === activeKey && 'bg-accent/60',
                )}
              >
                <span className={cn('size-1.5 shrink-0 rounded-full', bandDot[hb])} />
                <File className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{fname}</span>
                <span className={cn('ml-auto font-mono text-[10px]', bandColor[hb])}>{h.score}</span>
              </button>
            )
          })}
        </div>

        {/* source (reference) */}
        <div className="min-w-0 flex-1 overflow-auto bg-background font-mono text-xs">
          {fileQuery.isLoading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : content ? (
            <SourceView content={content} issueLines={NO_LINES} fixed={null} />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-muted-foreground">
              {repo
                ? 'Couldn’t load this file from the repo.'
                : 'No repository is linked to this hotspot, so the source can’t be shown.'}
            </div>
          )}
        </div>

        {/* metrics + refactor plan */}
        <div className="flex w-96 shrink-0 flex-col overflow-y-auto border-l border-border bg-panel">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={cn('font-mono text-2xl font-semibold tabular-nums', bandColor[b])}>
                {active.score}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{fileName}</p>
                <p className="font-mono text-[10px] text-muted-foreground">maintainability risk</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric label="Lines" value={active.loc} />
              <Metric label="Complexity" value={active.complexity} />
              <Metric label="Max nesting" value={active.maxNesting} />
              <Metric label="TODO/FIXME" value={active.todos} />
            </div>
            {active.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {active.tags.map((t) => (
                  <span key={t} className="rounded-sm border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {TAG_LABEL[t] ?? t}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {hotspotDescription(active)}
            </p>
          </div>

          {/* refactor plan */}
          <div className="min-h-0 flex-1 px-4 py-3">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <WandSparkles className="size-3" />
              Refactoring plan
            </div>
            {plan ? (
              <div className="text-xs leading-relaxed text-foreground/90">
                <Markdown content={plan} />
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Rather than rewriting the whole file, Riscly proposes a targeted,
                prioritized set of refactoring steps — which functions to extract,
                where to flatten nesting, and which TODOs to resolve — that you
                apply incrementally.
              </p>
            )}
            {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
          </div>

          {/* actions */}
          <div className="shrink-0 space-y-2 border-t border-border p-3">
            <ActionButton
              variant="primary"
              className="w-full justify-center"
              onClick={generatePlan}
              disabled={generating || !content}
              title="Have the AI propose a targeted maintainability refactoring plan"
            >
              {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {generating ? 'Generating…' : plan ? 'Regenerate plan' : 'Generate refactoring plan'}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-3.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}
