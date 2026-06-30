'use client'

import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  buildRecommendations,
  findingFingerprint,
  type CodeIssue,
  type SystemGraph,
  type TriageStatus,
} from '@riscly/shared'
import { api } from './api'
import { useAuth } from './auth-store'
import { useActiveProjectStore } from './active-project'
import {
  severityOrder,
  type Risk,
  type RiskCategory,
  type Severity,
} from './riscly-data'

/** A scan record as returned by the API, with the fields the UI consumes. */
export interface ScanRecord {
  id: string
  status: string
  graph?: SystemGraph
  reliabilityScore?: number
  findings?: ApiFinding[]
  createdAt: string
}

export interface ApiFinding {
  category: string
  severity: string
  title: string
  description?: string
  nodeId?: string
  weight?: number
  rule?: string
  file?: string
  line?: number
  repo?: string
  confidence?: 'verified' | 'high' | 'heuristic'
}

/** Projects for the active org. Disabled until the auth store has a token. */
export function useProjects() {
  const token = useAuth((s) => s.token)
  return useQuery({
    queryKey: ['projects'],
    queryFn: api.listProjects,
    enabled: Boolean(token),
  })
}

/**
 * The active repository/project: the one selected in the store, falling back to
 * the first. Each repo is its own project, so this drives all project-scoped
 * data — switching it swaps the dashboard's data.
 */
export function useActiveProject() {
  const projects = useProjects()
  const activeId = useActiveProjectStore((s) => s.activeProjectId)
  const list = projects.data ?? []
  const project = list.find((p) => p.id === activeId) ?? list[0] ?? null
  return {
    ...projects,
    projects: list,
    project,
    projectId: project?.id ?? null,
  }
}

/** The latest succeeded scan for a project (graph + findings + score). */
export function useLatestScan(projectId: string | null) {
  const token = useAuth((s) => s.token)
  return useQuery({
    queryKey: ['scans', projectId],
    enabled: Boolean(token && projectId),
    queryFn: async (): Promise<ScanRecord | null> => {
      const scans = (await api.listScans(projectId!)) as ScanRecord[]
      const succeeded = scans.filter((s) => s.status === 'succeeded')
      // listScans is newest-first; fall back to any scan if none succeeded yet.
      return succeeded[0] ?? scans[0] ?? null
    },
  })
}

/**
 * The active project's latest-scan system graph, or null when there is no
 * project/scan (callers fall back to their demo topology in that case).
 */
export function useSystemGraph(): {
  graph: SystemGraph | null
  isDemo: boolean
  loading: boolean
} {
  const { projectId } = useActiveProject()
  const scan = useLatestScan(projectId)
  const graph = scan.data?.graph ?? null
  if (projectId && graph && graph.nodes.length > 0) {
    return { graph, isDemo: false, loading: false }
  }
  return { graph: null, isDemo: true, loading: scan.isLoading }
}

export interface AffectedFile {
  repo: string
  file: string
  issues: CodeIssue[]
  worst: 'critical' | 'high' | 'medium' | 'low'
}

const SEV_RANK = { critical: 4, high: 3, medium: 2, low: 1 } as const

/** Files with code issues from the active project's latest scan, for the code
 *  view (only affected files are shown). */
export function useCodeIssues(): { files: AffectedFile[]; loading: boolean } {
  const { projectId } = useActiveProject()
  const scan = useLatestScan(projectId)
  const graph = scan.data?.graph as SystemGraph | undefined
  const issues = graph?.codeIssues ?? []

  const byFile = new Map<string, AffectedFile>()
  for (const i of issues) {
    const repo = i.repo ?? ''
    const key = `${repo}::${i.file}`
    const sev = (['critical', 'high', 'medium', 'low'] as const).includes(
      i.severity as never,
    )
      ? (i.severity as AffectedFile['worst'])
      : 'low'
    const entry =
      byFile.get(key) ?? { repo, file: i.file, issues: [], worst: 'low' }
    entry.issues.push(i)
    if (SEV_RANK[sev] > SEV_RANK[entry.worst]) entry.worst = sev
    byFile.set(key, entry)
  }
  const files = [...byFile.values()].sort(
    (a, b) => SEV_RANK[b.worst] - SEV_RANK[a.worst],
  )
  return { files, loading: scan.isLoading }
}

/**
 * Run a deep AI analysis over the active project's source files (security +
 * quality + correctness), merged into the latest scan. On-demand.
 */
export function useDeepScan() {
  const qc = useQueryClient()
  const { projectId } = useActiveProject()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{
    added: number
    filesAnalyzed: number
    aiEnabled: boolean
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async () => {
    if (!projectId || busy) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const r = await api.deepScan(projectId)
      setResult(r)
      await qc.invalidateQueries({ queryKey: ['scans', projectId] })
      if (!r.aiEnabled) {
        setError('AI analysis is not enabled on this server (set ANTHROPIC_API_KEY).')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }, [projectId, busy, qc])

  return { run, busy, result, error, canRun: Boolean(projectId) }
}

/**
 * Start adding a repository from inside the app (not the onboarding wizard):
 * create a fresh project and send the user straight to GitHub authorization,
 * returning to /settings where they pick the repo.
 */
export function useAddRepository() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const project = await api.createProject('Connecting…')
      const { url } = await api.oauthAuthorizeUrl('github', project.id, '/settings')
      window.location.href = url
    } catch (e) {
      setError(
        (e as Error).message ||
          'GitHub isn’t connected here. Configure the GitHub OAuth app first.',
      )
      setBusy(false)
    }
  }, [busy])

  return { start, busy, error }
}

/**
 * Repositories the user already authorized (granted via GitHub) that aren't yet
 * added as their own project — so a second repo can be added instantly by
 * cloning the existing authorization, with no OAuth round-trip.
 */
export function useAddableRepos(): {
  sourceProjectId: string | null
  available: string[]
  granted: string[]
  hasAuth: boolean
  loading: boolean
} {
  const token = useAuth((s) => s.token)
  const { projectId, projects } = useActiveProject()
  const conns = useQuery({
    queryKey: ['connections', projectId],
    queryFn: () => api.listConnections(projectId!),
    enabled: Boolean(token && projectId),
  })
  const gh = (conns.data ?? []).find((c) => c.provider === 'github')
  const granted = (gh?.metadata?.repos as string[] | undefined) ?? []
  // A project maps to a repo by its basename; subtract repos already added.
  const taken = new Set(projects.map((p) => p.name.toLowerCase()))
  const available = granted.filter(
    (r) => !taken.has((r.split('/').pop() ?? r).toLowerCase()),
  )
  return {
    sourceProjectId: projectId,
    available,
    granted,
    hasAuth: granted.length > 0,
    loading: conns.isLoading,
  }
}

/**
 * Add a repo as its own project by cloning an existing GitHub authorization
 * (server-side fan-out). Instant — no OAuth redirect, no full-page reload — and
 * the new project becomes active so the UI switches to it.
 */
export function useAddRepoFromGrant() {
  const qc = useQueryClient()
  const setActive = useActiveProjectStore((s) => s.setActiveProject)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const add = useCallback(
    async (sourceProjectId: string, repo: string) => {
      if (busy) return
      setBusy(true)
      setError(null)
      try {
        const { created } = await api.fanOut(sourceProjectId, [repo])
        await qc.invalidateQueries({ queryKey: ['projects'] })
        if (created[0]) setActive(created[0].id)
        else setError('Could not add the repository (plan limit reached?).')
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setBusy(false)
      }
    },
    [busy, qc, setActive],
  )

  return { add, busy, error }
}

/** Full scan history for the active project (oldest→newest), with risk score. */
export function useScanHistory(): {
  points: { id: string; at: string; risk: number; findings: number }[]
  loading: boolean
} {
  const token = useAuth((s) => s.token)
  const { projectId } = useActiveProject()
  const q = useQuery({
    queryKey: ['scan-history', projectId],
    enabled: Boolean(token && projectId),
    queryFn: async () => (await api.listScans(projectId!)) as ScanRecord[],
  })
  const points = (q.data ?? [])
    .filter((s) => s.status === 'succeeded' && typeof s.reliabilityScore === 'number')
    .map((s) => ({
      id: s.id,
      at: s.createdAt,
      risk: Math.max(0, Math.min(100, Math.round(100 - (s.reliabilityScore as number)))),
      findings: s.findings?.length ?? 0,
    }))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  return { points, loading: q.isLoading }
}

/** Connections for the active project (provider + status + metadata). */
export function useConnections() {
  const token = useAuth((s) => s.token)
  const { projectId } = useActiveProject()
  return useQuery({
    queryKey: ['connections', projectId],
    queryFn: () => api.listConnections(projectId!),
    enabled: Boolean(token && projectId),
  })
}

/** Recent commits for the active project's connected GitHub repos. */
export function useCommits() {
  const token = useAuth((s) => s.token)
  const { projectId } = useActiveProject()
  return useQuery({
    queryKey: ['commits', projectId],
    queryFn: () => api.listCommits(projectId!),
    enabled: Boolean(token && projectId),
  })
}

/** Human "x minutes ago" for a scan timestamp. */
export function relativeTime(iso?: string): string {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return 'never'
  const s = Math.round(ms / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

/** Metadata about the active project's latest scan (for headers/subtitles). */
export function useScanMeta(): { lastScanAt?: string; lastScanLabel: string } {
  const { projectId } = useActiveProject()
  const scan = useLatestScan(projectId)
  const at = scan.data?.createdAt
  return { lastScanAt: at, lastScanLabel: relativeTime(at) }
}

/**
 * Start a scan for the active project, poll until it settles, then refresh the
 * cached project/scan queries so every wired view updates.
 */
export function useRunScan() {
  const qc = useQueryClient()
  const { projectId } = useActiveProject()
  const [isScanning, setIsScanning] = useState(false)

  const run = useCallback(async () => {
    if (!projectId || isScanning) return
    setIsScanning(true)
    try {
      const scan = await api.startScan(projectId)
      // The engine is usually synchronous, but poll briefly in case it isn't.
      if (scan.status !== 'succeeded' && scan.status !== 'failed') {
        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 1000))
          const scans = (await api.listScans(projectId)) as ScanRecord[]
          const s = scans.find((x) => x.id === scan.id)
          if (!s || s.status === 'succeeded' || s.status === 'failed') break
        }
      }
      await qc.invalidateQueries({ queryKey: ['scans', projectId] })
      await qc.invalidateQueries({ queryKey: ['projects'] })
    } finally {
      setIsScanning(false)
    }
  }, [projectId, isScanning, qc])

  return { run, isScanning, canScan: Boolean(projectId) }
}

/**
 * Open a remediation-plan pull request for the active project's connected repo.
 * Returns the action plus busy/error/url state for inline button feedback.
 */
export function useRemediationPr() {
  const { projectId } = useActiveProject()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)

  const open = useCallback(async () => {
    if (!projectId || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.remediationPr(projectId)
      setUrl(res.url)
      if (res.url && typeof window !== 'undefined') {
        window.open(res.url, '_blank', 'noopener,noreferrer')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }, [projectId, busy])

  return { open, busy, error, url, canOpen: Boolean(projectId) }
}

/** Trigger a browser download of a generated project report. */
export async function downloadReport(
  projectId: string,
  type = 'full',
  format = 'pdf',
) {
  const blob = await api.downloadReport(projectId, type, format)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `riscly-${type}-report.${format}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// --- Adapters: map the API's analysis output onto the view data shapes -------

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low']
const CATEGORIES: RiskCategory[] = [
  'Security',
  'Code',
  'Infrastructure',
  'Performance',
  'Dependency',
  'Reliability',
]

function coerceSeverity(s: string): Severity {
  const l = (s ?? '').toLowerCase()
  return (SEVERITIES.includes(l as Severity) ? l : 'medium') as Severity
}

function coerceCategory(c: string): RiskCategory {
  const t = c ? c[0].toUpperCase() + c.slice(1).toLowerCase() : ''
  return (CATEGORIES.includes(t as RiskCategory) ? t : 'Reliability') as RiskCategory
}

/**
 * Recommendation (impact + concrete fix + risk reduction + cited references) for
 * a single finding, via the shared recommendations engine. Deterministic + pure.
 */
export function recommendationFor(f: ApiFinding) {
  try {
    return buildRecommendations([
      {
        category: f.category as never,
        severity: f.severity as never,
        title: f.title,
        description: f.description ?? '',
        nodeId: f.nodeId,
        weight: f.weight ?? 0,
      },
    ])[0]
  } catch {
    return undefined
  }
}

/** Turn engine findings into the Risk rows the UI renders, enriched with the
 *  impact analysis, recommended fix and cited references. */
/** Map a single finding to a Risk (with the given id), so a code-located
 *  finding carries the file/rule/repo needed for the one-click "View fix". */
/**
 * Triage decisions for the active project's findings, keyed by fingerprint, so
 * false positives / accepted risks / resolved findings stay suppressed across
 * re-scans. Exposes a lookup + a mutation to set a finding's status.
 */
export function useTriage(projectId: string | null) {
  const token = useAuth((s) => s.token)
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['triage', projectId],
    queryFn: () => api.listTriage(projectId!),
    enabled: Boolean(token && projectId),
  })
  const map = new Map<string, TriageStatus>((q.data ?? []).map((t) => [t.fingerprint, t.status]))
  const set = useMutation({
    mutationFn: (body: { fingerprint: string; status: TriageStatus; note?: string }) =>
      api.setTriage(projectId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['triage', projectId] })
    },
  })
  return {
    statusFor: (fp?: string): TriageStatus => (fp ? map.get(fp) ?? 'open' : 'open'),
    setTriage: set,
    loading: q.isLoading,
  }
}

export function findingToRisk(f: ApiFinding, id: string): Risk {
  const rec = recommendationFor(f)
  return {
    id,
    title: f.title,
    category: coerceCategory(f.category),
    severity: coerceSeverity(f.severity),
    description: f.description ?? '',
    impact: rec?.businessImpact ?? '',
    components: f.nodeId ? [f.nodeId] : [],
    rule: f.rule ?? f.category,
    file: f.file,
    line: f.line,
    repo: f.repo,
    confidence: f.confidence,
    fix: rec?.fix ?? '',
    riskReductionPct: rec?.riskReductionPct,
    references: rec?.references,
    status: 'open' as const,
    // Stable identity so a triage decision survives re-scans.
    fingerprint: findingFingerprint({ rule: f.rule, file: f.file, nodeId: f.nodeId, title: f.title }),
  }
}

export function findingsToRisks(findings: ApiFinding[]): Risk[] {
  return findings
    .map((f, i) => findingToRisk(f, `RSK-${String(i + 1).padStart(4, '0')}`))
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

/** Risks for the active project's latest scan (empty until scanned). */
export function useRisks(): { risks: Risk[]; loading: boolean } {
  const { projectId } = useActiveProject()
  const scan = useLatestScan(projectId)
  const findings = scan.data?.findings ?? []
  return {
    risks: projectId ? findingsToRisks(findings) : [],
    loading: scan.isLoading,
  }
}

/**
 * Headline reliability score for the active project's latest scan, or null when
 * there is no scan yet.
 */
export function useReliability(): { score: number | null; loading: boolean } {
  const { projectId } = useActiveProject()
  const scan = useLatestScan(projectId)
  const score = scan.data?.reliabilityScore
  return {
    score: projectId && typeof score === 'number' ? score : null,
    loading: scan.isLoading,
  }
}
