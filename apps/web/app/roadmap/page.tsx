import { CircleCheck, CircleDot, Circle } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/page-shell'

export const metadata = { title: 'Roadmap — Riscly' }

type Status = 'shipped' | 'progress' | 'planned'
const ITEMS: { status: Status; title: string; desc: string }[] = [
  { status: 'shipped', title: 'Architecture mapping', desc: 'Infer components and flows from code and connected services, with verified/inferred merge.' },
  { status: 'shipped', title: 'SAST, SCA & secret detection', desc: 'Dataflow analysis, transitive dependencies + SBOM, and masked secret findings.' },
  { status: 'shipped', title: 'One-click fixes', desc: 'Generate an AI fix, then commit it directly to your repo or open a PR.' },
  { status: 'shipped', title: 'Reliability & simulation', desc: 'Score reliability and simulate failures to estimate business impact.' },
  { status: 'progress', title: 'Continuous scanning', desc: 'Re-scan automatically on push and alert on new risk.' },
  { status: 'progress', title: 'Deeper cloud coverage', desc: 'More providers and richer infrastructure inference.' },
  { status: 'planned', title: 'Team workflows', desc: 'Assign findings, track remediation and report on posture over time.' },
  { status: 'planned', title: 'Compliance exports', desc: 'Framework-aligned reports (SOC 2, ISO 27001) from your live posture.' },
]

const META: Record<Status, { label: string; icon: typeof Circle; cls: string }> = {
  shipped: { label: 'Shipped', icon: CircleCheck, cls: 'text-ok' },
  progress: { label: 'In progress', icon: CircleDot, cls: 'text-primary' },
  planned: { label: 'Planned', icon: Circle, cls: 'text-muted-foreground' },
}

export default function RoadmapPage() {
  return (
    <MarketingShell
      eyebrow="Product"
      title="Roadmap"
      lead="Where Riscly is headed. This is a direction, not a contract — priorities shift as we learn from users."
    >
      <div className="space-y-2.5">
        {ITEMS.map((it) => {
          const m = META[it.status]
          return (
            <div key={it.title} className="flex items-start gap-3 rounded-lg border border-border bg-panel p-4">
              <m.icon className={`mt-0.5 size-4 shrink-0 ${m.cls}`} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">{it.title}</h2>
                  <span className={`rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${m.cls}`}>
                    {m.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{it.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Have a request? Email{' '}
        <a href="mailto:hello@riscly.app" className="text-primary hover:underline">hello@riscly.app</a>{' '}
        — user feedback shapes what we build next.
      </p>
    </MarketingShell>
  )
}
