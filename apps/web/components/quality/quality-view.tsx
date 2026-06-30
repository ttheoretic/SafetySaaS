'use client'

import { useMemo, useState } from 'react'
import { Activity, FileWarning, Boxes, ListTodo, FileCode, ChevronRight } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { useSystemGraph } from '@/lib/use-project-data'
import { RiskInspector } from '@/components/shared/risk-inspector'
import { findingFingerprint, type QualityHotspot } from '@riscly/shared'
import type { Risk, Severity } from '@/lib/riscly-data'
import { cn } from '@/lib/utils'

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

/** Turn a maintainability hotspot into a Risk so the shared inspector can open
 *  the file, generate an AI refactor and — after the user reviews it — push it
 *  to the repo (file + rule are set, so `canFix` is true). */
function hotspotToRisk(h: QualityHotspot): Risk {
  const b = band(h.score)
  const fileName = h.file.split('/').pop() || h.file
  const tagText = h.tags.map((t) => TAG_LABEL[t] ?? t).join(', ')
  const description =
    `This file scores ${h.score}/100 for maintainability risk: ` +
    `${h.loc} lines, branching complexity ${h.complexity}, max nesting ${h.maxNesting}` +
    (h.todos > 0 ? `, ${h.todos} unfinished marker${h.todos === 1 ? '' : 's'} (TODO/FIXME)` : '') +
    (tagText ? `. Flagged for: ${tagText}.` : '.')
  return {
    id: `QLT-${h.score}`,
    title: `Maintainability risk: ${fileName}`,
    category: 'Code',
    severity: b as Severity,
    description,
    impact:
      'Large, complex or deeply nested files are harder to change safely and are a common source of ' +
      'future defects and incidents. Refactoring and adding test coverage here lowers the risk of regressions.',
    components: [],
    file: h.file,
    line: 1,
    repo: h.repo,
    rule: QUALITY_RULE,
    confidence: 'heuristic',
    fix:
      'Break this file into smaller, focused units, reduce nesting by extracting helpers and early returns, ' +
      'simplify branching, and resolve the outstanding TODO/FIXME markers. Add tests around the extracted pieces.',
    status: 'open',
    fingerprint: findingFingerprint({ rule: QUALITY_RULE, file: h.file, title: h.file }),
  }
}

/**
 * Code Quality / maintainability — "future-problem" signals. Surfaces files
 * that are large, complex, deeply nested or TODO-heavy: code that isn't a
 * security bug today but is likely to cause defects or incidents later.
 */
export function QualityView() {
  const { graph } = useSystemGraph()
  const hotspots = useMemo(() => graph?.qualityHotspots ?? [], [graph])
  const summary = graph?.qualitySummary
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const selectedRisk = useMemo(() => {
    if (!selectedKey) return null
    const h = hotspots.find((x) => `${x.repo ?? ''}:${x.file}` === selectedKey)
    return h ? hotspotToRisk(h) : null
  }, [selectedKey, hotspots])

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

      {/* hotspot inspector — slides in over the right edge. Lets the user open
          the file, generate an AI refactor and push it once they're happy. */}
      {selectedRisk && (
        <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md border-l border-border bg-panel shadow-2xl">
          <RiskInspector risk={selectedRisk} onClose={() => setSelectedKey(null)} />
        </div>
      )}
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
