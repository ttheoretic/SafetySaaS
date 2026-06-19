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
  domains,
  funnel,
  byService,
  byLibrary,
  byTeam,
  securityIssues,
  exposureStats,
  type SecurityDomain,
  type GroupRow,
} from '@/lib/security-data'

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

  const issues = useMemo(
    () => securityIssues.filter((i) => i.domain === domain),
    [domain],
  )

  const groupRows: GroupRow[] =
    group === 'service' ? byService : group === 'library' ? byLibrary : byTeam

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Security posture"
        subtitle="Vulnerabilities across code, dependencies, secrets and infrastructure"
        actions={
          <>
            <ActionButton>Last scan 4m ago</ActionButton>
            <ActionButton variant="primary">Run scan</ActionButton>
          </>
        }
      />
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
              <Funnel />
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
            <DomainSummary domain={domain} />

            {/* issues list */}
            <div className="divide-y divide-border">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-accent/40"
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
                </div>
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
          <div className="divide-y divide-border">
            {groupRows.map((row) => (
              <GroupRowItem key={row.name} row={row} />
            ))}
          </div>
        </Panel>
      </div>
      </div>
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

function Funnel() {
  const maxCount = funnel[0].count
  return (
    <div className="flex flex-col gap-2">
      {funnel.map((stage, i) => {
        const pct = (stage.count / maxCount) * 100
        const dropFromPrev =
          i > 0 ? Math.round((1 - stage.count / funnel[i - 1].count) * 100) : null
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

function DomainSummary({ domain }: { domain: SecurityDomain }) {
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

function GroupRowItem({ row }: { row: GroupRow }) {
  const total = row.critical + row.high + row.medium
  return (
    <button className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/40">
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
