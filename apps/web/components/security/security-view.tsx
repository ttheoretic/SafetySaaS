'use client'

import { useMemo, useState } from 'react'
import {
  CodeXml,
  Boxes,
  KeyRound,
  Server,
  GitBranch,
  Rocket,
  Bomb,
  Globe,
  Bug,
  ShieldCheck,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { ScreenHeader, ActionButton } from '@/components/layout/screen-header'
import { SeverityBadge } from '@/components/ui/severity'
import { cn } from '@/lib/utils'
import {
  domains as mockDomains,
  funnel as mockFunnel,
  byService as mockByService,
  byLibrary,
  byTeam,
  securityIssues as mockSecurityIssues,
  exposureStats as mockExposureStats,
  type SecurityDomain,
  type SecurityIssue,
  type FunnelStage,
  type GroupRow,
} from '@/lib/security-data'
import {
  useActiveProject,
  useLatestScan,
  useSystemGraph,
  useRunScan,
  useScanMeta,
  recommendationFor,
  findingToRisk,
  type ApiFinding,
} from '@/lib/use-project-data'
import { RiskInspector } from '@/components/shared/risk-inspector'
import { Loader2, X } from 'lucide-react'
import type { Severity, Risk } from '@/lib/riscly-data'

type DomainMeta = (typeof mockDomains)[number]

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low']

function coerceSeverity(s: string): Severity {
  const l = (s ?? '').toLowerCase()
  return (SEVERITIES.includes(l as Severity) ? l : 'medium') as Severity
}

function classifyDomain(category: string): SecurityDomain {
  const c = (category ?? '').toLowerCase()
  if (c.includes('secret')) return 'secrets'
  if (
    c.includes('depend') ||
    c.includes('sca') ||
    c.includes('package') ||
    c.includes('library') ||
    c.includes('cve')
  )
    return 'sca'
  if (
    c.includes('infra') ||
    c.includes('iac') ||
    c.includes('terraform') ||
    c.includes('network') ||
    c.includes('cloud') ||
    c.includes('k8s') ||
    c.includes('kubernet')
  )
    return 'iac'
  return 'sast'
}

/**
 * The security page's data, wired to the active project's latest-scan findings
 * when available, falling back to the curated mock data in demo/empty states.
 */
// Graph node kinds that sit on an attacker-reachable, internet-facing path.
const INTERNET_FACING = new Set([
  'frontend',
  'cdn',
  'dns',
  'api',
  'external_api',
])

function useSecurityData(): {
  hasData: boolean
  loading: boolean
  domains: DomainMeta[]
  issues: SecurityIssue[]
  riskById: Map<string, Risk>
  exposureStats: typeof mockExposureStats
  funnel: FunnelStage[]
  byService: GroupRow[]
} {
  const { projectId } = useActiveProject()
  const scan = useLatestScan(projectId)
  const { graph } = useSystemGraph()
  const findings: ApiFinding[] = scan.data?.findings ?? []

  const result = useMemo(() => {
    if (!projectId || findings.length === 0) {
      // No scan → empty (no demo). The view shows a top-level empty state.
      return {
        domains: mockDomains.map((d) => ({
          ...d,
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        })),
        issues: [] as SecurityIssue[],
        riskById: new Map<string, Risk>(),
        exposureStats: {
          exploitable: 0,
          exposed: 0,
          fixAvailable: 0,
          meanTimeToRemediate: '—',
        },
        funnel: [] as FunnelStage[],
        byService: [] as GroupRow[],
      }
    }

    // Map a finding's nodeId to its graph node (name + kind) for service/exposure.
    const nodeById = new Map(
      (graph?.nodes ?? []).map((n) => [n.id, n] as const),
    )
    const isExposed = (f: ApiFinding) => {
      const node = f.nodeId ? nodeById.get(f.nodeId) : undefined
      return node ? INTERNET_FACING.has(node.kind) : false
    }

    // Build the issue rows and, in the same pass, a Risk per issue so a click
    // opens the full inspector (with the code-located one-click "View fix").
    const riskById = new Map<string, Risk>()
    const issues: SecurityIssue[] = findings.map((f, i) => {
      const node = f.nodeId ? nodeById.get(f.nodeId) : undefined
      const service = node?.name ?? f.nodeId ?? '—'
      const rec = recommendationFor(f)
      const id = `SEC-${String(i + 1).padStart(4, '0')}`
      riskById.set(id, findingToRisk(f, id))
      return {
        id,
        title: f.title,
        severity: coerceSeverity(f.severity),
        domain: classifyDomain(f.category),
        rule: f.category,
        location: service,
        service,
        inProduction: Boolean(f.nodeId),
        exploitAvailable: coerceSeverity(f.severity) === 'critical',
        exposed: isExposed(f),
        description: f.description,
        fix: rec?.fix,
      }
    }) as SecurityIssue[]

    // Override total + bySeverity on the mock domain metadata (keeps id/short/icons).
    const domains: DomainMeta[] = mockDomains.map((d) => {
      const domainIssues = issues.filter((i) => i.domain === d.id)
      const bySeverity: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 }
      for (const issue of domainIssues) bySeverity[issue.severity]++
      return { ...d, total: domainIssues.length, bySeverity }
    })

    const exposureStats = {
      exploitable: issues.filter((i) => i.exploitAvailable).length,
      exposed: issues.filter((i) => i.exposed).length,
      fixAvailable: issues.length,
      meanTimeToRemediate: mockExposureStats.meanTimeToRemediate,
    }

    // Attack-surface funnel, derived and kept monotonically non-increasing.
    const inProd = issues.filter((i) => i.inProduction).length
    const exploit = issues.filter((i) => i.exploitAvailable).length
    const exposed = issues.filter((i) => i.exposed).length
    const funnel: FunnelStage[] = [
      { id: 'branch', label: 'Default branch', desc: 'All open findings', count: issues.length },
      { id: 'prod', label: 'In production', desc: 'Reachable in a mapped service', count: Math.min(inProd, issues.length) },
      { id: 'exploit', label: 'Exploit available', desc: 'Critical, weaponizable', count: Math.min(exploit, inProd) },
      { id: 'exposed', label: 'Internet exposed', desc: 'On an internet-facing path', count: Math.min(exposed, exploit, inProd) },
    ]

    // Group by mapped service (graph node). No library/team source → those stay demo.
    const byServiceMap = new Map<string, GroupRow>()
    for (const f of findings) {
      const node = f.nodeId ? nodeById.get(f.nodeId) : undefined
      const name = node?.name ?? f.nodeId
      if (!name) continue
      const meta = node?.kind ? node.kind.replace(/_/g, ' ') : 'service'
      const row =
        byServiceMap.get(name) ?? { name, meta, critical: 0, high: 0, medium: 0 }
      const sev = coerceSeverity(f.severity)
      if (sev === 'critical') row.critical++
      else if (sev === 'high') row.high++
      else if (sev === 'medium') row.medium++
      byServiceMap.set(name, row)
    }
    const byService = [...byServiceMap.values()].sort(
      (a, b) => b.critical - a.critical || b.high - a.high,
    )

    return {
      domains,
      issues,
      riskById,
      exposureStats,
      funnel,
      byService,
    }
  }, [projectId, findings, graph])

  return {
    hasData: Boolean(projectId) && findings.length > 0,
    loading: scan.isLoading,
    ...result,
  }
}

const domainIcon: Record<SecurityDomain, React.ReactNode> = {
  sast: <CodeXml className="size-4" />,
  sca: <Boxes className="size-4" />,
  secrets: <KeyRound className="size-4" />,
  iac: <Server className="size-4" />,
}

const funnelIcon: Record<string, React.ReactNode> = {
  branch: <GitBranch className="size-3.5" />,
  prod: <Rocket className="size-3.5" />,
  exploit: <Bomb className="size-3.5" />,
  exposed: <Globe className="size-3.5" />,
}

type GroupTab = 'service' | 'library' | 'team'

export function SecurityView() {
  const [domain, setDomain] = useState<SecurityDomain>('sast')
  const [group, setGroup] = useState<GroupTab>('service')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const {
    hasData,
    loading,
    domains,
    issues: allIssues,
    riskById,
    exposureStats,
    funnel,
    byService,
  } = useSecurityData()
  const { lastScanLabel } = useScanMeta()
  const { run, isScanning, canScan } = useRunScan()

  const selectedRisk = selectedId ? riskById.get(selectedId) ?? null : null

  const issues = useMemo(
    () => allIssues.filter((i) => i.domain === domain),
    [allIssues, domain],
  )

  // Library / team groupings have no data source yet — service is real.
  const groupRows: GroupRow[] = group === 'service' ? byService : []

  const header = (
    <ScreenHeader
      title="Security posture"
      subtitle="Vulnerabilities across code, dependencies, secrets and infrastructure"
      actions={
        <>
          <ActionButton disabled>Last scan {lastScanLabel}</ActionButton>
          <ActionButton
            variant="primary"
            onClick={run}
            disabled={!canScan || isScanning}
          >
            {isScanning && <Loader2 className="size-3.5 animate-spin" />}
            {isScanning ? 'Scanning…' : 'Run scan'}
          </ActionButton>
        </>
      }
    />
  )

  if (!hasData) {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <ShieldCheck className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">No security findings yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {loading
              ? 'Loading…'
              : 'Connect a repository and run a scan to see your security posture.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col">
      {header}
      <div className="flex flex-1 flex-col overflow-y-auto">
      {/* exposure stats */}
      <div className="grid grid-cols-2 gap-px border-b border-border bg-border lg:grid-cols-4">
        <StatCard
          icon={<Bomb className="size-4 text-critical" />}
          label="Exploitable"
          value={exposureStats.exploitable}
          hint="public PoC or weaponized"
        />
        <StatCard
          icon={<Globe className="size-4 text-high" />}
          label="Internet exposed"
          value={exposureStats.exposed}
          hint="on an attacker-reachable path"
        />
        <StatCard
          icon={<ShieldCheck className="size-4 text-ok" />}
          label="Fix available"
          value={exposureStats.fixAvailable}
          hint="auto-remediation ready"
        />
        <StatCard
          icon={<Clock className="size-4 text-medium" />}
          label="Mean time to remediate"
          value={exposureStats.meanTimeToRemediate}
          hint="trailing 30 days"
        />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 p-4 xl:grid-cols-3">
        {/* left: funnel + issues */}
        <div className="flex flex-col gap-4 xl:col-span-2">
          <Panel>
            <PanelHeader
              title="Attack surface funnel"
              icon={<Bug className="size-3.5 text-primary" />}
            />
            <div className="p-3">
              <p className="mb-3 text-xs text-muted-foreground">
                Prioritise findings that are actually reachable and weaponizable, not just the raw count.
              </p>
              <Funnel stages={funnel} />
            </div>
          </Panel>

          <Panel className="min-h-0">
            <PanelHeader
              title={`${domains.find((d) => d.id === domain)!.short} findings`}
              icon={domainIcon[domain]}
              action={
                <span className="font-mono text-[11px] text-muted-foreground">
                  {issues.length} shown
                </span>
              }
            />

            {/* domain tabs */}
            <div className="flex gap-1 border-b border-border px-2 py-2">
              {domains.map((d) => {
                const active = d.id === domain
                return (
                  <button
                    key={d.id}
                    onClick={() => setDomain(d.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors',
                      active
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                    )}
                  >
                    <span className={active ? 'text-primary' : ''}>
                      {domainIcon[d.id]}
                    </span>
                    {d.short}
                    <span
                      className={cn(
                        'rounded-sm px-1 font-mono text-[10px]',
                        active ? 'bg-background text-foreground' : 'text-muted-foreground/70',
                      )}
                    >
                      {d.total}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* severity summary bar for active domain */}
            <DomainSummary domain={domain} domains={domains} />

            {/* issues list */}
            <div className="divide-y divide-border">
              {issues.map((issue) => (
                <button
                  key={issue.id}
                  onClick={() => setSelectedId(issue.id)}
                  className={cn(
                    'flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/40',
                    selectedId === issue.id && 'bg-accent/60',
                  )}
                >
                  <SeverityBadge severity={issue.severity} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{issue.title}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-muted-foreground">
                      <span>{issue.rule}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="truncate">{issue.location}</span>
                    </div>
                    {issue.description && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {issue.description}
                      </p>
                    )}
                    {issue.fix && (
                      <p className="mt-1.5 flex items-start gap-1.5 rounded-sm border border-ok/20 bg-ok/5 px-2 py-1 text-[11px] leading-relaxed text-foreground/90">
                        <ShieldCheck className="mt-0.5 size-3 shrink-0 text-ok" />
                        <span>
                          <span className="font-medium text-ok">Fix: </span>
                          {issue.fix}
                        </span>
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Tag icon={<Server className="size-3" />} label={issue.service} />
                      {issue.inProduction && (
                        <Tag icon={<Rocket className="size-3" />} label="In production" tone="high" />
                      )}
                      {issue.exploitAvailable && (
                        <Tag icon={<Bomb className="size-3" />} label="Exploit available" tone="critical" />
                      )}
                      {issue.exposed && (
                        <Tag icon={<Globe className="size-3" />} label="Exposed" tone="critical" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {issues.length === 0 && (
                <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                  No findings in this category.
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* right: grouping */}
        <Panel className="h-fit">
          <PanelHeader
            title="Vulnerabilities grouped"
            icon={<Boxes className="size-3.5 text-primary" />}
          />
          <div className="flex gap-1 border-b border-border px-2 py-2">
            {(['service', 'library', 'team'] as GroupTab[]).map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={cn(
                  'flex-1 rounded-md px-2 py-1.5 text-xs capitalize transition-colors',
                  group === g
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )}
              >
                By {g}
              </button>
            ))}
          </div>
          {group === 'service' ? (
            <div className="divide-y divide-border">
              {groupRows.length === 0 ? (
                <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                  No mapped services yet.
                </p>
              ) : (
                groupRows.map((row) => (
                  <GroupRowItem
                    key={row.name}
                    row={row}
                    onSelect={() => {
                      const first = allIssues.find((i) => i.service === row.name)
                      if (first) {
                        setDomain(first.domain)
                        setSelectedId(first.id)
                      }
                    }}
                  />
                ))
              )}
            </div>
          ) : (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              Grouping by {group} isn’t available yet — group by service to drill
              into findings.
            </p>
          )}
        </Panel>
      </div>
      </div>

      {/* finding inspector — slides in over the right edge */}
      {selectedRisk && (
        <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md border-l border-border bg-panel shadow-2xl">
          <RiskInspector risk={selectedRisk} onClose={() => setSelectedId(null)} />
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  hint: string
}) {
  return (
    <div className="bg-background px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  )
}

function Funnel({ stages }: { stages: FunnelStage[] }) {
  const maxCount = stages[0]?.count || 1
  return (
    <div className="flex flex-col gap-2">
      {stages.map((stage, i) => {
        const pct = (stage.count / maxCount) * 100
        const dropFromPrev =
          i > 0 && stages[i - 1].count > 0
            ? Math.round((1 - stage.count / stages[i - 1].count) * 100)
            : null
        const tone =
          i === 0
            ? 'bg-muted-foreground/40'
            : i === 1
              ? 'bg-medium'
              : i === 2
                ? 'bg-high'
                : 'bg-critical'
        return (
          <div key={stage.id} className="flex items-center gap-3">
            <div className="flex w-40 shrink-0 items-center gap-2">
              <span className="text-muted-foreground">{funnelIcon[stage.id]}</span>
              <div className="min-w-0">
                <div className="text-xs font-medium">{stage.label}</div>
                <div className="truncate text-[10px] text-muted-foreground">{stage.desc}</div>
              </div>
            </div>
            <div className="relative h-7 flex-1 overflow-hidden rounded-sm bg-secondary/50">
              <div
                className={cn('h-full rounded-sm transition-all', tone)}
                style={{ width: `${pct}%` }}
              />
              <span className="absolute inset-y-0 left-2 flex items-center font-mono text-xs font-semibold">
                {stage.count}
              </span>
            </div>
            <div className="w-14 shrink-0 text-right">
              {dropFromPrev !== null && (
                <span className="font-mono text-[11px] text-ok">−{dropFromPrev}%</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DomainSummary({
  domain,
  domains,
}: {
  domain: SecurityDomain
  domains: DomainMeta[]
}) {
  const d = domains.find((x) => x.id === domain)!
  const order: (keyof typeof d.bySeverity)[] = ['critical', 'high', 'medium', 'low']
  const colors: Record<string, string> = {
    critical: 'bg-critical',
    high: 'bg-high',
    medium: 'bg-medium',
    low: 'bg-low',
  }
  return (
    <div className="flex items-center gap-4 border-b border-border px-3 py-2.5">
      <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-secondary/50">
        {order.map((s) => (
          <div
            key={s}
            className={colors[s]}
            style={{ width: `${(d.bySeverity[s] / d.total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-3 font-mono text-[11px]">
        {order.map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className={cn('size-1.5 rounded-full', colors[s])} />
            {d.bySeverity[s]}
          </span>
        ))}
      </div>
    </div>
  )
}

function Tag({
  icon,
  label,
  tone = 'muted',
}: {
  icon: React.ReactNode
  label: string
  tone?: 'muted' | 'high' | 'critical'
}) {
  const tones = {
    muted: 'border-border text-muted-foreground',
    high: 'border-high/30 bg-high/10 text-high',
    critical: 'border-critical/30 bg-critical/10 text-critical',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium',
        tones[tone],
      )}
    >
      {icon}
      {label}
    </span>
  )
}

function GroupRowItem({ row, onSelect }: { row: GroupRow; onSelect?: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/40"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{row.name}</div>
        <div className="truncate text-[11px] text-muted-foreground">{row.meta}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {row.critical > 0 && (
          <span className="rounded-sm bg-critical/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-critical">
            {row.critical}C
          </span>
        )}
        {row.high > 0 && (
          <span className="rounded-sm bg-high/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-high">
            {row.high}H
          </span>
        )}
        <span className="font-mono text-[11px] text-muted-foreground">+{row.medium}</span>
      </div>
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/40" />
    </button>
  )
}
