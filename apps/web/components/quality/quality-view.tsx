'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  FileWarning,
  Boxes,
  ListTodo,
  FileCode,
  ChevronRight,
  X,
  Sparkles,
  WandSparkles,
  Loader2,
  Check,
  ExternalLink,
} from 'lucide-react'
import { ScreenHeader, ActionButton } from '@/components/layout/screen-header'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { useSystemGraph, useActiveProject, useCodeFix } from '@/lib/use-project-data'
import { useRepoFileContent, SourceView } from '@/components/code/code-view'
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
const TAG_LABEL: Record<string, string> = {
  'large-file': 'Large file',
  'high-complexity': 'High complexity',
  'deep-nesting': 'Deep nesting',
  todos: 'Unfinished (TODOs)',
}

const QUALITY_RULE = 'quality/maintainability'

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
 */
export function QualityView() {
  const { graph } = useSystemGraph()
  const { projectId } = useActiveProject()
  const hotspots = useMemo(() => graph?.qualityHotspots ?? [], [graph])
  const summary = graph?.qualitySummary
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const selected = useMemo(
    () => hotspots.find((x) => `${x.repo ?? ''}:${x.file}` === selectedKey) ?? null,
    [selectedKey, hotspots],
  )

  return (
    <div className="relative flex h-full flex-col">
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
                const key = `${h.repo ?? ''}:${h.file}`
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/40',
                      selectedKey === key && 'bg-accent/60',
                    )}
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

      {/* hotspot code panel — opens an inline code area (like Code/SAST) where
          the user sees the file, generates an AI refactor shown in green under
          the code, and pushes it once verified. */}
      {selected && projectId && (
        <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-3xl border-l border-border bg-panel shadow-2xl">
          <HotspotCodePanel
            key={`${selected.repo ?? ''}:${selected.file}`}
            projectId={projectId}
            hotspot={selected}
            onClose={() => setSelectedKey(null)}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Inline code + fix panel for a maintainability hotspot. Loads the file, lets
 * the user generate an AI refactor (rendered in green directly under the
 * original lines) and push it straight to the repo after they've verified it —
 * the same flow as Code (SAST), scoped to this one file.
 */
function HotspotCodePanel({
  projectId,
  hotspot,
  onClose,
}: {
  projectId: string
  hotspot: QualityHotspot
  onClose: () => void
}) {
  const repo = hotspot.repo ?? null
  const fileQuery = useRepoFileContent(projectId, repo, hotspot.file)
  const content = fileQuery.data?.content ?? null
  const { fix, generate, generating, commit, committing, commitUrl, error } =
    useCodeFix(projectId, repo, hotspot.file)

  const fileName = hotspot.file.split('/').pop() || hotspot.file
  const b = band(hotspot.score)
  const payload = {
    ...(repo ? { repo } : {}),
    file: hotspot.file,
    line: 1,
    rule: QUALITY_RULE,
    title: `Refactor ${fileName} for maintainability`,
    description: hotspotDescription(hotspot),
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* header */}
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('font-mono text-sm font-semibold tabular-nums', bandColor[b])}>
              {hotspot.score}
            </span>
            <span className="truncate font-mono text-[12px]">{hotspot.file}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
            <span>{hotspot.loc} LOC</span>
            <span>complexity {hotspot.complexity}</span>
            <span>nesting {hotspot.maxNesting}</span>
            {hotspot.todos > 0 && <span>{hotspot.todos} TODO</span>}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* code / diff */}
      <div className="min-h-0 flex-1 overflow-auto bg-background font-mono text-xs">
        {fileQuery.isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : content ? (
          <SourceView content={content} issueLines={NO_LINES} fixed={fix?.fixed ?? null} />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
            {repo
              ? 'Couldn’t load this file from the repo.'
              : 'No repository is linked to this hotspot, so the source can’t be shown.'}
          </div>
        )}
      </div>

      {/* actions */}
      <div className="shrink-0 space-y-2 border-t border-border p-3">
        {fix?.explanation && (
          <div className="rounded-md border border-ok/20 bg-ok/5 px-2.5 py-2">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ok">
              <WandSparkles className="size-3" />
              Suggested refactor — shown in green in the code
            </div>
            <p className="text-xs leading-relaxed text-foreground/90">{fix.explanation}</p>
          </div>
        )}

        {commitUrl ? (
          <>
            <div className="flex items-center justify-center gap-1.5 rounded-md border border-ok/30 bg-ok/10 px-2.5 py-2 text-xs font-medium text-ok">
              <Check className="size-3.5" /> Pushed to your repo
            </div>
            <a
              href={commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3.5" /> View commit
            </a>
          </>
        ) : !fix?.fixed ? (
          <ActionButton
            variant="primary"
            className="w-full justify-center"
            onClick={() => generate(payload)}
            disabled={generating || committing || !content}
            title="Have the AI propose a maintainability refactor for this file"
          >
            {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {generating ? 'Generating…' : 'Generate refactor'}
          </ActionButton>
        ) : (
          <>
            <ActionButton
              variant="primary"
              className="w-full justify-center"
              onClick={() => commit(payload)}
              disabled={committing}
              title="Commit this refactor directly to your repo"
            >
              {committing ? <Loader2 className="size-3.5 animate-spin" /> : <WandSparkles className="size-3.5" />}
              {committing ? 'Pushing…' : 'Apply fix — push to repo'}
            </ActionButton>
            <ActionButton
              className="w-full justify-center"
              onClick={() => generate(payload)}
              disabled={generating || committing}
            >
              <Sparkles className="size-3.5" />
              Regenerate
            </ActionButton>
          </>
        )}

        {error && <p className="text-[11px] text-destructive">{error}</p>}
      </div>
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
