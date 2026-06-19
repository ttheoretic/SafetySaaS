import {
  Network,
  ShieldAlert,
  LockKeyhole,
  FlaskConical,
  CodeXml,
  Bot,
} from 'lucide-react'

const features = [
  {
    icon: Network,
    title: 'Architecture mapping',
    body: 'Auto-discover services, dependencies and data flows. See critical paths and blast radius on an interactive graph.',
    accent: 'text-primary',
  },
  {
    icon: ShieldAlert,
    title: 'Risk triage',
    body: 'A unified problems panel across code, infra, dependencies and reliability — ranked by real exposure, not raw severity.',
    accent: 'text-critical',
  },
  {
    icon: LockKeyhole,
    title: 'Security posture',
    body: 'SAST, SCA, secret scanning and IaC in one funnel — from default branch to production, with exploitability context.',
    accent: 'text-high',
  },
  {
    icon: CodeXml,
    title: 'Contextual code fixes',
    body: 'Inline diffs with AI-generated patches you can review and ship as a pull request without leaving the console.',
    accent: 'text-ok',
  },
  {
    icon: FlaskConical,
    title: 'Failure simulation',
    body: 'Run scenarios like database loss or traffic spikes and watch how failures cascade across your services in real time.',
    accent: 'text-medium',
  },
  {
    icon: Bot,
    title: 'AI assistant',
    body: 'Ask about any risk, service or fix in natural language. Grounded in your actual architecture and findings.',
    accent: 'text-primary',
  },
]

export function LandingFeatures() {
  return (
    <section id="capabilities" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-wider text-primary">
          Capabilities
        </p>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          One console for risk across your whole stack
        </h2>
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
          Riscly connects the dots between architecture, security and code so
          your team fixes what matters first.
        </p>
      </div>

      <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => {
          const Icon = f.icon
          return (
            <div
              key={f.title}
              className="group relative bg-panel p-6 transition-colors hover:bg-panel-2"
            >
              <span className="flex size-9 items-center justify-center rounded-md border border-border bg-background">
                <Icon className={`size-5 ${f.accent}`} />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
