import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { GetStartedButton } from './get-started-button'

const columns = [
  {
    title: 'Product',
    links: ['Overview', 'Architecture', 'Risks', 'Security', 'Simulation'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'Changelog', 'Security model', 'Status'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Contact', 'Privacy'],
  },
]

export function LandingCta() {
  return (
    <section id="get-started" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-panel px-6 py-14 text-center sm:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] opacity-40 [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_80%_at_50%_50%,black,transparent)]"
        />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Start mapping your risk today
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-pretty leading-relaxed text-muted-foreground">
            Connect a repository and get a full architecture and security
            posture in minutes. Free for your first project.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GetStartedButton className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto" />
            <a
              href="#capabilities"
              className="inline-flex w-full items-center justify-center rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:border-muted-foreground/40 sm:w-auto"
            >
              Talk to sales
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-panel/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
                <ShieldCheck className="size-4 text-primary" />
              </span>
              <span className="text-[15px] font-semibold tracking-tight">
                Riscly
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Security &amp; architecture intelligence for teams shipping
              software at scale.
            </p>
          </div>

          {columns.map((c) => (
            <div key={c.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {c.title}
              </h4>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="font-mono text-xs text-muted-foreground">
            © 2026 Riscly, Inc. All rights reserved.
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            Built for security engineers.
          </p>
        </div>
      </div>
    </footer>
  )
}
