'use client'

import { useEffect, useState } from 'react'
import { ClipboardCheck, Check } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { cn } from '@/lib/utils'

type Policy = {
  blockSeverity: 'critical' | 'high' | 'medium' | 'low'
  blockNewSecrets: boolean
  blockKnownVulns: boolean
  requireScanOnPr: boolean
  requirePassingSimulation: boolean
}

const DEFAULTS: Policy = {
  blockSeverity: 'high',
  blockNewSecrets: true,
  blockKnownVulns: true,
  requireScanOnPr: true,
  requirePassingSimulation: false,
}

const KEY = 'riscly.policies'
const LEVELS: Policy['blockSeverity'][] = ['critical', 'high', 'medium', 'low']

export function PoliciesView() {
  const [policy, setPolicy] = useState<Policy>(DEFAULTS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setPolicy({ ...DEFAULTS, ...JSON.parse(raw) })
    } catch {
      /* keep defaults */
    }
  }, [])

  const update = (patch: Partial<Policy>) => {
    const next = { ...policy, ...patch }
    setPolicy(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Policies"
        subtitle="Guardrails for what's allowed to ship"
        actions={
          saved ? (
            <span className="inline-flex items-center gap-1 text-xs text-ok">
              <Check className="size-3.5" /> Saved
            </span>
          ) : undefined
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-start gap-2.5 rounded-md border border-medium/30 bg-medium/10 px-3 py-2.5">
            <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-medium" />
            <p className="text-xs leading-relaxed text-foreground">
              Define your guardrails here. Enforcement on pull requests (the
              break-the-build gate) activates once the CI/CD integration is connected —
              until then these settings describe your intended policy.
            </p>
          </div>

          <div className="overflow-hidden rounded-md border border-border">
            <div className="border-b border-border bg-panel p-3">
              <p className="text-sm font-medium">Block merges at or above</p>
              <p className="mb-2 text-xs text-muted-foreground">
                A PR introducing a finding at this severity or higher fails the check.
              </p>
              <div className="flex gap-1.5">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    onClick={() => update({ blockSeverity: l })}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                      policy.blockSeverity === l
                        ? 'border-primary/50 bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <Row
              title="Block newly committed secrets"
              desc="Fail the check when a new secret is detected."
              on={policy.blockNewSecrets}
              onToggle={() => update({ blockNewSecrets: !policy.blockNewSecrets })}
            />
            <Row
              title="Block known vulnerable dependencies"
              desc="Fail when a dependency with a known CVE is added."
              on={policy.blockKnownVulns}
              onToggle={() => update({ blockKnownVulns: !policy.blockKnownVulns })}
            />
            <Row
              title="Require a scan on every PR"
              desc="No merge without a completed Riscly scan."
              on={policy.requireScanOnPr}
              onToggle={() => update({ requireScanOnPr: !policy.requireScanOnPr })}
            />
            <Row
              title="Require passing impact simulation"
              desc="Block if a change increases the blast radius."
              on={policy.requirePassingSimulation}
              onToggle={() => update({ requirePassingSimulation: !policy.requirePassingSimulation })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({
  title,
  desc,
  on,
  onToggle,
}: {
  title: string
  desc: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-panel px-3 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        className={cn(
          'inline-flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors',
          on ? 'bg-primary' : 'bg-secondary',
        )}
      >
        <span
          className={cn(
            'size-4 rounded-full bg-foreground shadow-sm transition-transform duration-200',
            on ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  )
}
