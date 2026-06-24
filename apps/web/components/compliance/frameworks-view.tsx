'use client'

import { useMemo, useState } from 'react'
import { ClipboardCheck, CheckCircle2, AlertTriangle } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { useRisks } from '@/lib/use-project-data'
import type { Risk } from '@/lib/riscly-data'
import { cn } from '@/lib/utils'

type Control = {
  id: string
  label: string
  /** True when a risk is evidence this control is NOT satisfied. */
  match: (r: Risk) => boolean
}

type Framework = { id: string; name: string; blurb: string; controls: Control[] }

const has = (r: Risk, ...needles: string[]) => {
  const hay = `${r.category} ${r.rule ?? ''} ${r.title}`.toLowerCase()
  return needles.some((n) => hay.includes(n))
}

const FRAMEWORKS: Framework[] = [
  {
    id: 'soc2',
    name: 'SOC 2',
    blurb: 'Security, availability and confidentiality criteria.',
    controls: [
      { id: 'cc6.1', label: 'Secrets & credential management', match: (r) => has(r, 'secret', 'credential', 'token', 'key') },
      { id: 'cc6.6', label: 'Vulnerability management (SCA)', match: (r) => has(r, 'dependency', 'cve', 'ghsa', 'vuln') },
      { id: 'cc6.7', label: 'Secure transmission (TLS)', match: (r) => has(r, 'tls', 'verify', 'insecure', 'rejectunauthorized') },
      { id: 'cc7.1', label: 'Code security (SAST)', match: (r) => has(r, 'injection', 'eval', 'xss', 'sql', 'code') },
      { id: 'a1.2', label: 'Availability & redundancy', match: (r) => has(r, 'redundan', 'spof', 'backup', 'single point') },
    ],
  },
  {
    id: 'iso27001',
    name: 'ISO 27001',
    blurb: 'Annex A information-security controls (subset).',
    controls: [
      { id: 'a8.8', label: 'Technical vulnerabilities', match: (r) => has(r, 'dependency', 'cve', 'vuln', 'injection', 'eval') },
      { id: 'a8.12', label: 'Data leakage / secrets', match: (r) => has(r, 'secret', 'credential', 'token') },
      { id: 'a8.24', label: 'Cryptography in transit', match: (r) => has(r, 'tls', 'verify', 'insecure') },
      { id: 'a8.14', label: 'Redundancy of resources', match: (r) => has(r, 'redundan', 'spof', 'backup') },
      { id: 'a8.9', label: 'Configuration hardening', match: (r) => has(r, 'docker', 'root', 'cors', 'rate limit', 'config') },
    ],
  },
]

export function FrameworksView() {
  const { risks } = useRisks()
  const [openId, setOpenId] = useState('soc2')

  const evaluated = useMemo(() => {
    return FRAMEWORKS.map((fw) => {
      const controls = fw.controls.map((c) => {
        const related = risks.filter(c.match)
        return { ...c, related, ok: related.length === 0 }
      })
      const okCount = controls.filter((c) => c.ok).length
      return { ...fw, controls, okCount, total: controls.length }
    })
  }, [risks])

  const open = evaluated.find((f) => f.id === openId) ?? evaluated[0]

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Frameworks"
        subtitle="Control coverage mapped from your current findings"
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-start gap-2.5 rounded-md border border-medium/30 bg-medium/10 px-3 py-2.5">
            <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-medium" />
            <p className="text-xs leading-relaxed text-foreground">
              An indicative mapping of your scan findings to common controls. A control
              shows a <span className="font-medium">gap</span> when related findings are
              open. Formal, auditable control mapping and evidence collection arrive with
              the compliance engine.
            </p>
          </div>

          <div className="mb-3 flex gap-2">
            {evaluated.map((fw) => (
              <button
                key={fw.id}
                onClick={() => setOpenId(fw.id)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                  openId === fw.id
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {fw.name}
                <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                  {fw.okCount}/{fw.total}
                </span>
              </button>
            ))}
          </div>

          {open && (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="flex items-center justify-between border-b border-border bg-panel px-3 py-2">
                <span className="text-xs text-muted-foreground">{open.blurb}</span>
                <span className="font-mono text-xs font-semibold">
                  {Math.round((open.okCount / open.total) * 100)}% covered
                </span>
              </div>
              <div className="divide-y divide-border">
                {open.controls.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 bg-panel px-3 py-2.5">
                    {c.ok ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />
                    ) : (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-high" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-mono text-[10px] text-muted-foreground">{c.id.toUpperCase()}</span>{' '}
                        {c.label}
                      </p>
                      {!c.ok && (
                        <p className="text-[11px] text-high">
                          {c.related.length} related finding{c.related.length === 1 ? '' : 's'} open
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase',
                        c.ok ? 'bg-ok/15 text-ok' : 'bg-high/15 text-high',
                      )}
                    >
                      {c.ok ? 'Pass' : 'Gap'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
