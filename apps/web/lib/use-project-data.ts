'use client'

import { useQuery } from '@tanstack/react-query'
import type { SystemGraph } from '@riscly/shared'
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

/** Turn engine findings into the Risk rows the UI renders. */
export function findingsToRisks(findings: ApiFinding[]): Risk[] {
  return findings
    .map((f, i) => ({
      id: `RSK-${String(i + 1).padStart(4, '0')}`,
      title: f.title,
      category: coerceCategory(f.category),
      severity: coerceSeverity(f.severity),
      description: f.description ?? '',
      impact: '',
      components: f.nodeId ? [f.nodeId] : [],
      rule: f.category,
      fix: '',
      status: 'open' as const,
    }))
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
