'use client'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/landing-v2/navbar'
import { Footer } from '@/components/landing-v2/footer'
import { GetStartedButton } from '@/components/landing/get-started-button'
import { PREVIEWS } from '@/components/features/previews'
import { FEATURES } from '@/lib/features-content'
import { cn } from '@/lib/utils'

export function FeaturePage({ slug }: { slug: string }) {
  const f = FEATURES[slug]
  if (!f) notFound()
  const Hero = PREVIEWS[f.hero]

  return (
    <div className="min-h-dvh bg-background pt-16 text-foreground">
      <Navbar />

      {/* hero */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{f.eyebrow}</p>
            <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{f.title}</h1>
            <p className="mt-4 max-w-xl text-pretty leading-relaxed text-muted-foreground">{f.lead}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <GetStartedButton className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90" />
              <Link
                href="/docs"
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:border-muted-foreground/40"
              >
                Read the docs <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
          <div className="lg:pl-6">
            <Hero />
          </div>
        </div>
      </section>

      {/* benefits */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {f.benefits.map((b) => (
            <div key={b.title} className="rounded-xl border border-border bg-panel p-5">
              <span className="flex size-8 items-center justify-center rounded-md bg-ok/10 ring-1 ring-ok/20">
                <Check className="size-4 text-ok" />
              </span>
              <h3 className="mt-3 text-sm font-semibold">{b.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* alternating sections */}
      <section className="mx-auto max-w-6xl space-y-16 px-4 py-10 sm:px-6">
        {f.sections.map((s, i) => {
          const P = PREVIEWS[s.preview]
          const flip = i % 2 === 1
          return (
            <div key={s.title} className="grid items-center gap-10 lg:grid-cols-2">
              <div className={cn(flip && 'lg:order-2')}>
                <h2 className="text-2xl font-semibold tracking-tight">{s.title}</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{s.body}</p>
                {s.bullets && (
                  <ul className="mt-4 space-y-2">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-foreground/90">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className={cn(flip && 'lg:order-1')}>
                <P />
              </div>
            </div>
          )
        })}
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-border bg-panel px-6 py-12 text-center sm:px-12">
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            See {f.title} on your own code
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-pretty leading-relaxed text-muted-foreground">
            Connect a repository and get a full architecture and risk report in minutes. Free for your first project.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GetStartedButton className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90" />
            <Link href="/pricing" className="inline-flex items-center justify-center rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:border-muted-foreground/40">
              Compare plans
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
