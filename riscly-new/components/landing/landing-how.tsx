import { GitBranch, ScanLine, GitPullRequestArrow } from 'lucide-react'

const steps = [
  {
    n: '01',
    icon: GitBranch,
    title: 'Connect your repositories',
    body: 'Link GitHub or GitLab. Riscly builds a live map of your services, dependencies and infrastructure — no agent to install.',
  },
  {
    n: '02',
    icon: ScanLine,
    title: 'Scan & prioritize',
    body: 'Continuous SAST, SCA, secret and IaC scanning feeds a single risk model that ranks issues by real production exposure.',
  },
  {
    n: '03',
    icon: GitPullRequestArrow,
    title: 'Fix in context',
    body: 'Review AI-suggested patches inline, simulate the blast radius, and ship the fix as a pull request — all from the console.',
  },
]

export function LandingHow() {
  return (
    <section id="how" className="border-y border-border bg-panel/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-wider text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            From connected repo to merged fix
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.n}
                className="relative rounded-xl border border-border bg-panel p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-md border border-border bg-background">
                    <Icon className="size-5 text-primary" />
                  </span>
                  <span className="font-mono text-2xl font-semibold text-muted-foreground/30">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
