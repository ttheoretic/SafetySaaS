'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FolderOpen,
  File,
  WandSparkles,
  Sparkles,
  Check,
  Loader2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import { ScreenHeader, ActionButton } from '@/components/layout/screen-header'
import { SeverityBadge } from '@/components/ui/severity'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import {
  useActiveProject,
  useCodeIssues,
  useDeepScan,
  useCodeFix,
  type AffectedFile,
} from '@/lib/use-project-data'
import { cn } from '@/lib/utils'

type DeepScan = ReturnType<typeof useDeepScan>

/** On-demand deep AI code analysis trigger, reused in the header + empty state.
 *  Accepts a shared hook instance so the page can react when the scan finishes. */
function DeepScanButton({ deep, variant }: { deep: DeepScan; variant?: 'primary' }) {
  const { run, busy, result, error, canRun } = deep
  return (
    <div className="flex flex-col items-start gap-1">
      <ActionButton
        variant={variant}
        onClick={run}
        disabled={!canRun || busy}
        title="Have the AI analyse your source for security & quality issues"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Sparkles className="size-3.5" />
        )}
        {busy ? 'Analysing…' : 'Deep AI scan'}
      </ActionButton>
      {result && !error && (
        <span className="text-[11px] text-muted-foreground">
          {result.added} issue{result.added === 1 ? '' : 's'} across{' '}
          {result.filesAnalyzed} files
        </span>
      )}
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </div>
  )
}

/** Split a repo blob path into its directory prefix and file name. */
function splitPath(path: string): { dir: string; name: string } {
  const i = path.lastIndexOf('/')
  if (i === -1) return { dir: '', name: path }
  return { dir: path.slice(0, i + 1), name: path.slice(i + 1) }
}

const sevDot = {
  critical: 'bg-critical',
  high: 'bg-high',
  medium: 'bg-medium',
  low: 'bg-low',
  ok: 'bg-ok',
}

/** Raw source of one repo file, loaded on selection. Exported so other code
 *  surfaces (e.g. the Code Quality hotspot panel) share the same query cache
 *  key, so a fix commit's invalidation refetches everywhere. */
export function useRepoFileContent(
  projectId: string | null,
  repo: string | null,
  path: string | null,
) {
  const token = useAuth((s) => s.token)
  return useQuery({
    queryKey: ['code-file-content', projectId, repo, path],
    queryFn: () => api.fileContent(projectId!, repo!, path!),
    enabled: Boolean(token && projectId && repo && path),
  })
}

/**
 * Top-level switch. The page does NOT surface findings on load: a deep AI scan
 * must be run first (the fast scan finds far less), so we always start on a
 * "Deep scan" call-to-action and only reveal the issue-driven view once the
 * user has run the deep analysis this session.
 */
export function CodeView() {
  const { projectId } = useActiveProject()
  const { files: affected } = useCodeIssues()
  const deep = useDeepScan()
  const [revealed, setRevealed] = useState(false)

  // Reveal the findings only after a deep scan completes in this session.
  useEffect(() => {
    if (deep.result) setRevealed(true)
  }, [deep.result])

  // No connected project yet.
  if (!projectId) {
    return (
      <div className="flex h-full flex-col">
        <ScreenHeader
          title="Code Analysis"
          subtitle="Security & quality issues located in your code"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <FolderOpen className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">No repository connected</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Connect a repository and run a scan to analyse your code.
          </p>
        </div>
      </div>
    )
  }

  // Before a deep scan (or while it runs) → the start screen with the button.
  if (!revealed) {
    return (
      <div className="flex h-full flex-col">
        <ScreenHeader
          title="Code Analysis"
          subtitle="Security & quality issues located in your code"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <Sparkles className="size-8 text-primary" />
          <p className="text-sm font-medium">Run a deep AI scan to find code issues</p>
          <p className="max-w-md text-xs text-muted-foreground">
            The fast scan only catches committed secrets and obvious misconfig.
            A deep AI analysis reads your source for real security &amp; quality
            issues and locates them in the files. Start it here — nothing is
            analysed until you do.
          </p>
          <DeepScanButton deep={deep} variant="primary" />
        </div>
      </div>
    )
  }

  // After a deep scan: issue-driven view, or an explicit "all clear" state.
  if (affected.length > 0) {
    return <IssueCodeView projectId={projectId} files={affected} deep={deep} />
  }
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Code Analysis"
        subtitle="Security & quality issues located in your code"
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <ShieldCheck className="size-8 text-ok" />
        <p className="text-sm font-medium">No code issues found</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          The deep AI analysis reviewed your source and found no security or
          quality issues to fix. Re-run it any time after you push changes.
        </p>
        <DeepScanButton deep={deep} variant="primary" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Issue-driven view: only affected files + regions, red issues / green fix
// ---------------------------------------------------------------------------

type DiffRow = { type: 'same' | 'add' | 'del'; text: string }

/** Minimal LCS line diff so we can render removed (red) / added (green) lines. */
export function lineDiff(a: string[], b: string[]): DiffRow[] {
  const n = a.length
  const m = b.length
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] =
        a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out: DiffRow[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', text: a[i++] })
    } else {
      out.push({ type: 'add', text: b[j++] })
    }
  }
  while (i < n) out.push({ type: 'del', text: a[i++] })
  while (j < m) out.push({ type: 'add', text: b[j++] })
  return out
}

function IssueCodeView({
  projectId,
  files,
  deep,
}: {
  projectId: string
  files: AffectedFile[]
  deep: DeepScan
}) {
  const [activeKey, setActiveKey] = useState(`${files[0].repo}::${files[0].file}`)
  const active =
    files.find((f) => `${f.repo}::${f.file}` === activeKey) ?? files[0]

  // Which issue (contiguous region) is selected for fixing — each is fixed and
  // pushed individually.
  const [activeIssueId, setActiveIssueId] = useState(active.issues[0].id)
  const issue =
    active.issues.find((i) => i.id === activeIssueId) ?? active.issues[0]

  const fileQuery = useRepoFileContent(projectId, active.repo, active.file)
  const content = fileQuery.data?.content ?? null

  const { fix, generate, generating, commit, committing, commitUrl, error, reset } =
    useCodeFix(projectId, active.repo, active.file)

  // Reset selection + fix state whenever the selected file changes.
  useEffect(() => {
    setActiveIssueId(active.issues[0].id)
    reset()
  }, [activeKey, active.issues, reset])

  // Reset the generated fix whenever the selected region changes.
  useEffect(() => {
    reset()
  }, [activeIssueId, reset])

  // Highlight only the selected region's lines in red.
  const issueLines = useMemo(() => {
    const s = new Set<number>()
    for (let l = issue.line; l <= (issue.endLine ?? issue.line); l++) s.add(l)
    return s
  }, [issue])

  const fixPayload = {
    repo: active.repo,
    file: active.file,
    line: issue.line,
    rule: issue.rule,
    title: issue.title,
    description: issue.description,
  }

  const { dir, name } = splitPath(active.file)

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Code Analysis"
        subtitle={`${dir}${name} · ${active.issues.length} issue${active.issues.length === 1 ? '' : 's'}`}
        actions={<DeepScanButton deep={deep} />}
      />

      <div className="flex min-h-0 flex-1">
        {/* affected files */}
        <div className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar">
          <div className="flex items-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <FolderOpen className="size-3.5" />
            Affected files ({files.length})
          </div>
          {files.map((f) => {
            const key = `${f.repo}::${f.file}`
            const fname = splitPath(f.file).name
            return (
              <button
                key={key}
                onClick={() => setActiveKey(key)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent/50',
                  key === activeKey && 'bg-accent/60',
                )}
              >
                <span className={cn('size-1.5 shrink-0 rounded-full', sevDot[f.worst])} />
                <File className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{fname}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {f.issues.length}
                </span>
              </button>
            )
          })}
        </div>

        {/* code / diff */}
        <div className="min-w-0 flex-1 overflow-auto bg-background font-mono text-xs">
          {fileQuery.isLoading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : content ? (
            <SourceView
              content={content}
              issueLines={issueLines}
              fixed={fix?.fixed ?? null}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-muted-foreground">
              Couldn’t load this file from the repo.
            </div>
          )}
        </div>

        {/* issue inspector — each issue is generated & pushed on its own */}
        <div className="flex w-[30rem] shrink-0 flex-col overflow-y-auto border-l border-border bg-panel">
          <div className="border-b border-border px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Issues in this file
          </div>
          <div className="divide-y divide-border">
            {active.issues.map((i) => {
              const selected = i.id === activeIssueId
              return (
                <div
                  key={i.id}
                  className={cn('px-4 py-3', selected && 'bg-accent/40')}
                >
                  <button
                    onClick={() => setActiveIssueId(i.id)}
                    className="block w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={i.severity} />
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {i.file.split('/').pop()}:{i.line}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium leading-snug">{i.title}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      rule: {i.rule}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {i.description}
                    </p>
                    {i.snippet && (
                      <pre className="mt-2 overflow-x-auto rounded-sm border border-critical/20 bg-critical/5 px-2 py-1 font-mono text-[11px] text-critical">
                        {i.snippet}
                      </pre>
                    )}
                  </button>

                  {/* per-region fix flow (only on the selected issue) */}
                  {selected && (
                    <div className="mt-3 space-y-2">
                      {fix?.explanation && (
                        <div className="rounded-md border border-ok/20 bg-ok/5 px-2.5 py-2">
                          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ok">
                            <WandSparkles className="size-3" />
                            Suggested fix — shown in green in the code
                          </div>
                          <p className="text-xs leading-relaxed text-foreground/90">
                            {fix.explanation}
                          </p>
                        </div>
                      )}

                      {commitUrl ? (
                        <div className="space-y-2">
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
                        </div>
                      ) : !fix?.fixed ? (
                        <ActionButton
                          className="w-full justify-center"
                          onClick={() => generate(fixPayload)}
                          disabled={generating || committing}
                        >
                          {generating ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="size-3.5" />
                          )}
                          {generating ? 'Generating…' : 'Generate fix'}
                        </ActionButton>
                      ) : (
                        <div className="space-y-2">
                          <ActionButton
                            variant="primary"
                            className="w-full justify-center"
                            onClick={() => commit(fixPayload)}
                            disabled={committing}
                            title="Commit this region's fix directly to your repo"
                          >
                            {committing ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <WandSparkles className="size-3.5" />
                            )}
                            {committing ? 'Pushing…' : 'Apply fix — push to repo'}
                          </ActionButton>
                          <ActionButton
                            className="w-full justify-center"
                            onClick={() => generate(fixPayload)}
                            disabled={generating || committing}
                          >
                            <Sparkles className="size-3.5" />
                            Regenerate
                          </ActionButton>
                        </div>
                      )}

                      {error && (
                        <p className="text-[11px] text-destructive">{error}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Code line with a gutter line-number / +/- marker. */
function CodeLine({
  marker,
  text,
  tone,
}: {
  marker: string
  text: string
  tone?: 'add' | 'del' | 'issue'
}) {
  return (
    <div
      className={cn(
        'flex',
        tone === 'add' && 'border-l-2 border-ok bg-ok/10',
        tone === 'del' && 'border-l-2 border-critical bg-critical/10',
        tone === 'issue' && 'border-l-2 border-critical bg-critical/10',
      )}
    >
      <span className="w-10 shrink-0 select-none px-2 text-right text-muted-foreground/50">
        {marker}
      </span>
      <span
        className={cn(
          'whitespace-pre px-2',
          tone === 'add' && 'text-ok',
          tone === 'del' && 'text-critical',
        )}
      >
        {text || ' '}
      </span>
    </div>
  )
}

/**
 * The file's source with the offending lines in red. When a fix is generated,
 * the corrected lines are spliced in green directly beneath the red ones
 * (inline diff), so the fix sits right under the problem.
 */
export function SourceView({
  content,
  issueLines,
  fixed,
}: {
  content: string
  issueLines: Set<number>
  fixed: string | null
}) {
  // No fix yet → plain source with red issue lines.
  if (!fixed) {
    return (
      <div className="min-w-max">
        {content.split('\n').map((line, idx) => (
          <CodeLine
            key={idx}
            marker={String(idx + 1)}
            text={line}
            tone={issueLines.has(idx + 1) ? 'issue' : undefined}
          />
        ))}
      </div>
    )
  }

  // Inline diff: unchanged lines normal (issue lines red), removed lines red,
  // and the green replacement immediately below.
  const rows = lineDiff(content.split('\n'), fixed.split('\n'))
  let orig = 0
  return (
    <div className="min-w-max">
      {rows.map((r, idx) => {
        if (r.type === 'add') {
          return <CodeLine key={idx} marker="+" text={r.text} tone="add" />
        }
        orig += 1
        if (r.type === 'del') {
          return <CodeLine key={idx} marker="−" text={r.text} tone="del" />
        }
        return (
          <CodeLine
            key={idx}
            marker={String(orig)}
            text={r.text}
            tone={issueLines.has(orig) ? 'issue' : undefined}
          />
        )
      })}
    </div>
  )
}
