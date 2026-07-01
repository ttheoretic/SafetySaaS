'use client'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, AlertTriangle, Quote } from 'lucide-react'
import { Navbar } from '@/components/landing-v2/navbar'
import { Footer } from '@/components/landing-v2/footer'
import { GetStartedButton } from '@/components/landing/get-started-button'
import { PREVIEWS } from '@/components/features/previews'
import { SOLUTIONS } from '@/lib/solutions-content'
import { FEATURES } from '@/lib/features-content'

export function SolutionPage({ slug }: { slug: string }) {
  const s = SOLUTIONS[slug]
  if (!s) notFound()
  const Hero = PREVIEWS[s.hero]

  return (
    <div className="min-h-dvh bg-background pt-16 text-foreground">
      <Navbar />

      {/* hero */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{s.eyebrow}</p>
            <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{s.title}</h1>
            <p className="mt-4 max-w-xl text-pretty leading-relaxed text-muted-foreground">{s.lead}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <GetStartedButton className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90" />
              <Link href="/pricing" className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:border-muted-foreground/40">
                Compare plans <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
          <div className="lg:pl-6"><Hero /></div>
        </div>
      </section>

      {/* problems */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sound familiar?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {s.problems.map((p) => (
            <div key={p.title} className="rounded-xl border border-border bg-panel p-5">
              <span className="flex size-8 items-center justify-center rounded-md bg-high/10 ring-1 ring-high/20">
                <AlertTriangle className="size-4 text-high" />
              </span>
              <h3 className="mt-3 text-sm font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* journey */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">How Riscly helps</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {s.journey.map((j, i) => (
            <div key={j.title} className="relative rounded-xl border border-border bg-panel p-5">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary ring-1 ring-primary/30">
                {i + 1}
              </span>
              <h3 className="mt-3 text-sm font-semibold">{j.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{j.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* outcomes */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
          {s.outcomes.map((o) => (
            <div key={o.label} className="bg-panel p-6 text-center">
              <div className="text-2xl font-semibold tracking-tight text-primary">{o.stat}</div>
              <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{o.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* quote */}
      {s.quote && (
        <section className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6">
          <Quote className="mx-auto size-6 text-primary/40" />
          <p className="mt-3 text-balance text-lg font-medium leading-relaxed">“{s.quote.text}”</p>
          <p className="mt-2 text-sm text-muted-foreground">{s.quote.who}</p>
        </section>
      )}

      {/* capabilities you'll use → cross-link to feature pages */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Capabilities you’ll use</h2>
        <p className="mt-2 text-sm text-muted-foreground">The parts of the platform that matter most for this.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {s.features.map((fSlug) => {
            const f = FEATURES[fSlug]
            if (!f) return null
            return (
              <Link key={fSlug} href={`/features/${fSlug}`} className="group rounded-xl border border-border bg-panel p-5 transition-colors hover:border-primary/40">
                <h3 className="text-sm font-semibold group-hover:text-primary">{f.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{f.lead}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Learn more <ArrowRight className="size-3.5" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-border bg-panel px-6 py-12 text-center sm:px-12">
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Start with your own code</h2>
          <p className="mx-auto mt-3 max-w-lg text-pretty leading-relaxed text-muted-foreground">
            Connect a repository and get a full architecture and risk report in minutes. Free for your first project.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GetStartedButton className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90" />
            <Link href="/docs" className="inline-flex items-center justify-center rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:border-muted-foreground/40">
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
