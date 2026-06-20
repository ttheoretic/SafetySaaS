'use client'

import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { buildRecommendations, type SystemGraph } from '@riscly/shared'
import { api } from './api'
import { useAuth } from './auth-store'
import {
  risks as demoRisks,
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

/** The first project — the app is single-project per org for now. */
export function useActiveProject() {
  const projects = useProjects()
  return {
    ...projects,
    project: projects.data?.[0] ?? null,
    projectId: projects.data?.[0]?.id ?? null,
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
export function findingsToRisks(findings: ApiFinding[]): Risk[] {
  return findings
    .map((f, i) => {
      const rec = recommendationFor(f)
      return {
        id: `RSK-${String(i + 1).padStart(4, '0')}`,
        title: f.title,
        category: coerceCategory(f.category),
        severity: coerceSeverity(f.severity),
        description: f.description ?? '',
        impact: rec?.businessImpact ?? '',
        components: f.nodeId ? [f.nodeId] : [],
        rule: f.category,
        fix: rec?.fix ?? '',
        riskReductionPct: rec?.riskReductionPct,
        references: rec?.references,
        status: 'open' as const,
      }
    })
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

/**
 * Risks for the active project's latest scan, falling back to the curated demo
 * set when there is no project/scan yet (keeps the designed experience intact
 * in demo mode and on empty states).
 */
export function useRisks(): { risks: Risk[]; isDemo: boolean; loading: boolean } {
  const { projectId } = useActiveProject()
  const scan = useLatestScan(projectId)
  const findings = scan.data?.findings ?? []
  if (projectId && findings.length > 0) {
    return { risks: findingsToRisks(findings), isDemo: false, loading: false }
  }
  return { risks: demoRisks, isDemo: true, loading: scan.isLoading }
}

/**
 * Headline reliability score for the active project's latest scan. Falls back
 * to the demo project's score in demo mode.
 */
export function useReliability(): {
  score: number
  isDemo: boolean
  loading: boolean
} {
  const { projectId } = useActiveProject()
  const scan = useLatestScan(projectId)
  const score = scan.data?.reliabilityScore
  if (projectId && typeof score === 'number') {
    return { score, isDemo: false, loading: false }
  }
  return { score: 68, isDemo: true, loading: scan.isLoading }
}
