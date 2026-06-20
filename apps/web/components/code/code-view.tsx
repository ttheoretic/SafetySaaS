'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FolderOpen,
  File,
  CircleAlert,
  WandSparkles,
  GitPullRequestArrow,
  Sparkles,
  Check,
  TriangleAlert,
  Loader2,
} from 'lucide-react'
import { ScreenHeader, ActionButton } from '@/components/layout/screen-header'
import { SeverityBadge } from '@/components/ui/severity'
import { fileTree, type CodeFile } from '@/lib/code-data'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { useActiveProject, useRemediationPr } from '@/lib/use-project-data'
import { cn } from '@/lib/utils'

/** Best-effort language label from a file extension, for the header. */
function langOf(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    tf: 'hcl',
    go: 'go',
    rb: 'ruby',
    java: 'java',
    rs: 'rust',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    md: 'markdown',
    sh: 'shell',
  }
  return map[ext] ?? ext ?? 'text'
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

/** Real repo file tree for the active project (flat blob paths). */
function useRepoFiles() {
  const token = useAuth((s) => s.token)
  const { projectId } = useActiveProject()
  const query = useQuery({
    queryKey: ['code-files', projectId],
    queryFn: () => api.listFiles(projectId!),
    enabled: Boolean(token && projectId),
  })
  return { projectId, ...query }
}

/** Raw source of one repo file, loaded on selection. */
function useRepoFileContent(
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
 * Top-level switch: render the real connected-repo experience when the active
 * project has files, otherwise fall back to the curated demo file tree.
 */
export function CodeView() {
  const { projectId, data, isLoading } = useRepoFiles()
  const hasRealFiles = Boolean(projectId && (data?.files?.length ?? 0) > 0)

  if (hasRealFiles) {
    return (
      <RealCodeView
        projectId={projectId!}
        repo={data!.repo}
        files={data!.files.map((f) => f.path)}
      />
    )
  }
  // While the first listFiles request is in flight for a real project, keep the
  // demo experience rather than flashing an empty shell; it swaps in on load.
  void isLoading
  return <DemoCodeView />
}

// ---------------------------------------------------------------------------
// Real connected-repo view
// ---------------------------------------------------------------------------

function RealCodeView({
  projectId,
  repo,
  files,
}: {
  projectId: string
  repo: string | null
  files: string[]
}) {
  const [activePath, setActivePath] = useState(files[0])
  const [leftW, setLeftW] = useState(220)
  const [rightW, setRightW] = useState(320)
  const containerRef = useRef<HTMLDivElement>(null)

  // Keep a valid selection if the file list changes underneath us.
  useEffect(() => {
    if (!files.includes(activePath) && files.length > 0) {
      setActivePath(files[0])
    }
  }, [files, activePath])

  const content = useRepoFileContent(projectId, repo, activePath)
  const { dir, name } = splitPath(activePath)
  const lang = langOf(activePath)
  const remediation = useRemediationPr()

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Code Analysis"
        subtitle={`${dir}${name} · ${lang}`}
        actions={
          <>
            <ActionButton
              onClick={remediation.open}
              disabled={remediation.busy}
              title="Open a remediation-plan pull request on your connected repo"
            >
              {remediation.busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <GitPullRequestArrow className="size-3.5" />
              )}
              Create PR
            </ActionButton>
            <ActionButton variant="primary" disabled>
              <WandSparkles className="size-3.5" />
              Apply fix
            </ActionButton>
          </>
        }
      />

      <div ref={containerRef} className="flex min-h-0 flex-1">
        {/* explorer */}
        <div
          className="flex flex-col overflow-y-auto border-r border-border bg-sidebar"
          style={{ width: leftW, minWidth: leftW }}
        >
          <div className="flex items-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <FolderOpen className="size-3.5" />
            {repo ?? 'repository'}
          </div>
          <div className="flex flex-col">
            {files.map((path) => {
              const f = splitPath(path)
              return (
                <button
                  key={path}
                  onClick={() => setActivePath(path)}
                  title={path}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                    activePath === path
                      ? 'bg-accent/60 text-foreground'
                      : 'text-muted-foreground hover:bg-accent/30',
                  )}
                >
                  <File className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-mono text-[12px]">{f.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <ResizeHandle
          containerRef={containerRef}
          onResize={(dx) =>
            setLeftW((w) => Math.min(Math.max(w + dx, 160), 380))
          }
        />

        {/* editor */}
        <RealEditor
          name={name}
          content={content.data?.content ?? null}
          loading={content.isLoading}
          error={content.isError}
        />

        <ResizeHandle
          containerRef={containerRef}
          onResize={(dx) =>
            setRightW((w) => Math.min(Math.max(w - dx, 240), 520))
          }
        />

        {/* issue inspector — no line-level findings from this API */}
        <div
          className="flex flex-col border-l border-border"
          style={{ width: rightW, minWidth: rightW }}
        >
          <RealInspector />
        </div>
      </div>
    </div>
  )
}

function RealEditor({
  name,
  content,
  loading,
  error,
}: {
  name: string
  content: string | null
  loading: boolean
  error: boolean
}) {
  if (loading) {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 bg-background text-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground/60" />
        <p className="text-xs text-muted-foreground">Loading {name}…</p>
      </div>
    )
  }

  if (error || content === null) {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 bg-background text-center">
        <File className="size-8 text-muted-foreground/40" />
        <p className="text-sm">{name}</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {error
            ? 'Could not load this file from the repository.'
            : 'No preview available for this file.'}
        </p>
      </div>
    )
  }

  const lines = content.replace(/\n$/, '').split('\n')

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-background">
      {/* tab */}
      <div className="flex h-8 shrink-0 items-center border-b border-border bg-panel">
        <div className="flex h-full items-center gap-2 border-r border-border bg-background px-3 font-mono text-[12px]">
          <File className="size-3.5 text-muted-foreground" />
          {name}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto py-2 font-mono text-[12px] leading-6">
        {lines.map((text, i) => (
          <div key={i} className="group flex items-start gap-3 px-3">
            <span className="w-8 shrink-0 select-none text-right text-muted-foreground/50">
              {i + 1}
            </span>
            <code className="whitespace-pre-wrap break-all text-foreground/85">
              {text}
            </code>
          </div>
        ))}
      </div>
    </div>
  )
}

function RealInspector() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-panel">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <Sparkles className="size-7 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">
          No inline findings for this file.
        </p>
      </div>
      <div className="mt-auto space-y-2 p-3">
        <ActionButton variant="primary" className="w-full justify-center" disabled>
          <WandSparkles className="size-3.5" />
          Apply fix
        </ActionButton>
        <ActionButton className="w-full justify-center">
          <GitPullRequestArrow className="size-3.5" />
          Create pull request
        </ActionButton>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demo view (curated mock file tree) — unchanged behavior
// ---------------------------------------------------------------------------

function DemoCodeView() {
  const [activeId, setActiveId] = useState(fileTree[0].id)
  const [applied, setApplied] = useState(false)
  const [leftW, setLeftW] = useState(220)
  const [rightW, setRightW] = useState(320)
  const containerRef = useRef<HTMLDivElement>(null)
  const active = useMemo(
    () => fileTree.find((f) => f.id === activeId)!,
    [activeId],
  )
  const remediation = useRemediationPr()

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Code Analysis"
        subtitle={`${active.path}${active.name} · ${active.lang}`}
        actions={
          <>
            <ActionButton
              onClick={remediation.open}
              disabled={!remediation.canOpen || remediation.busy}
              title={
                remediation.canOpen
                  ? 'Open a remediation-plan pull request on your connected repo'
                  : 'Connect a project to open a PR'
              }
            >
              {remediation.busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <GitPullRequestArrow className="size-3.5" />
              )}
              Create PR
            </ActionButton>
            <ActionButton
              variant="primary"
              onClick={() => setApplied(true)}
              disabled={applied}
            >
              {applied ? <Check className="size-3.5" /> : <WandSparkles className="size-3.5" />}
              {applied ? 'Fix applied' : 'Apply fix'}
            </ActionButton>
          </>
        }
      />

      <div ref={containerRef} className="flex min-h-0 flex-1">
        {/* explorer */}
        <div
          className="flex flex-col overflow-y-auto border-r border-border bg-sidebar"
          style={{ width: leftW, minWidth: leftW }}
        >
          <div className="flex items-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <FolderOpen className="size-3.5" />
            shopist-platform
          </div>
          <div className="flex flex-col">
            {fileTree.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setActiveId(f.id)
                  setApplied(false)
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                  activeId === f.id
                    ? 'bg-accent/60 text-foreground'
                    : 'text-muted-foreground hover:bg-accent/30',
                )}
              >
                <File className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-mono text-[12px]">{f.name}</span>
                {f.issueCount > 0 && (
                  <span className="ml-auto flex items-center gap-1">
                    <span className={cn('size-1.5 rounded-full', sevDot[f.severity])} />
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {f.issueCount}
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <ResizeHandle
          containerRef={containerRef}
          onResize={(dx) =>
            setLeftW((w) => Math.min(Math.max(w + dx, 160), 380))
          }
        />

        {/* editor */}
        <Editor file={active} applied={applied} />

        <ResizeHandle
          containerRef={containerRef}
          onResize={(dx) =>
            setRightW((w) => Math.min(Math.max(w - dx, 240), 520))
          }
        />

        {/* issue inspector */}
        <div
          className="flex flex-col border-l border-border"
          style={{ width: rightW, minWidth: rightW }}
        >
          <IssueInspector file={active} applied={applied} onApply={() => setApplied(true)} />
        </div>
      </div>
    </div>
  )
}

function ResizeHandle({
  onResize,
  containerRef,
}: {
  onResize: (dx: number) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const [dragging, setDragging] = useState(false)
  const lastX = useRef(0)

  const onMove = useCallback(
    (e: MouseEvent) => {
      const dx = e.clientX - lastX.current
      lastX.current = e.clientX
      onResize(dx)
    },
    [onResize],
  )

  const stop = useCallback(() => setDragging(false), [])

  useEffect(() => {
    if (!dragging) return
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', stop)
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', stop)
    }
  }, [dragging, onMove, stop])

  return (
    <div
      onMouseDown={(e) => {
        lastX.current = e.clientX
        setDragging(true)
      }}
      className={cn(
        'group relative w-1 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary/60',
        dragging && 'bg-primary',
      )}
      role="separator"
      aria-orientation="vertical"
    >
      <span className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  )
}

function Editor({ file, applied }: { file: CodeFile; applied: boolean }) {
  if (file.lines.length === 0) {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 bg-background text-center">
        <File className="size-8 text-muted-foreground/40" />
        <p className="text-sm">{file.name}</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Open dogmover.py to see inline vulnerability highlighting and the AI fix
          diff. (Source preview is illustrative for this file.)
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-background">
      {/* tab */}
      <div className="flex h-8 shrink-0 items-center border-b border-border bg-panel">
        <div className="flex h-full items-center gap-2 border-r border-border bg-background px-3 font-mono text-[12px]">
          <File className="size-3.5 text-muted-foreground" />
          {file.name}
          <span className="size-1.5 rounded-full bg-critical" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto py-2 font-mono text-[12px] leading-6">
        {file.lines.map((l) => {
          const isIssue = l.issue && !applied
          return (
            <div
              key={l.n}
              className={cn(
                'group flex items-start gap-3 px-3',
                isIssue && 'bg-critical/10',
              )}
            >
              <span className="w-8 shrink-0 select-none text-right text-muted-foreground/50">
                {l.n}
              </span>
              {isIssue && (
                <CircleAlert className="mt-1 size-3 shrink-0 text-critical" />
              )}
              <code
                className={cn(
                  'whitespace-pre-wrap break-all',
                  isIssue
                    ? 'text-foreground underline decoration-critical decoration-wavy underline-offset-4'
                    : 'text-foreground/85',
                  applied && l.issue && 'text-ok',
                )}
              >
                {applied && l.issue
                  ? l.text.replace('json=data)', 'json=data, timeout=10)')
                  : l.text}
              </code>
            </div>
          )
        })}
        {applied && (
          <div className="mx-3 mt-3 flex items-center gap-1.5 rounded-md bg-ok/10 px-2.5 py-1.5 text-[11px] text-ok">
            <Check className="size-3.5" />
            Fix applied — timeout=10 added to requests.post on line 318.
          </div>
        )}
      </div>
    </div>
  )
}

function IssueInspector({
  file,
  applied,
  onApply,
}: {
  file: CodeFile
  applied: boolean
  onApply: () => void
}) {
  const issue = file.issue
  if (!issue) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 bg-panel px-6 text-center">
        <Sparkles className="size-7 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">
          No issue selected for this file.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-panel">
      <div className="border-b border-border px-4 py-3">
        <div className="mb-1.5 flex items-center gap-2">
          <SeverityBadge severity={issue.severity} />
          <span className="font-mono text-[11px] text-muted-foreground">
            {file.path}
            {file.name}:{issue.line}
          </span>
        </div>
        <h3 className="text-sm font-semibold">{issue.title}</h3>
        <div className="mt-1 inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {issue.rule}
        </div>
      </div>

      {/* diff */}
      <div className="border-b border-border">
        <div className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-3 text-primary" />
          Suggested fix
        </div>
        <div className="overflow-x-auto bg-background font-mono text-[11px] leading-5">
          {issue.diff.before.map((line, i) => (
            <div key={`b${i}`} className="flex gap-2 bg-critical/10 px-3">
              <span className="select-none text-critical">-</span>
              <code className="whitespace-pre text-foreground/80">{line}</code>
            </div>
          ))}
          {issue.diff.after.map((line, i) => (
            <div key={`a${i}`} className="flex gap-2 bg-ok/10 px-3">
              <span className="select-none text-ok">+</span>
              <code className="whitespace-pre text-foreground/90">{line}</code>
            </div>
          ))}
        </div>
        <p className="px-4 py-2 text-[10px] text-muted-foreground">
          This code fix was generated by AI. Accuracy may vary.
        </p>
      </div>

      {/* explanation */}
      <div className="border-b border-border px-4 py-3">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <TriangleAlert className="size-3 text-high" />
          AI-suggested code fix
        </div>
        <ul className="flex flex-col gap-1.5">
          {issue.explanation.map((e, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
              {e}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto space-y-2 p-3">
        <ActionButton
          variant="primary"
          className="w-full justify-center"
          onClick={onApply}
          disabled={applied}
        >
          {applied ? <Check className="size-3.5" /> : <WandSparkles className="size-3.5" />}
          {applied ? 'Fix applied' : 'Apply fix'}
        </ActionButton>
        <ActionButton className="w-full justify-center">
          <GitPullRequestArrow className="size-3.5" />
          Create pull request
        </ActionButton>
      </div>
    </div>
  )
}
