import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LandingNav } from '@/components/landing/landing-nav'
import { LandingFooter } from '@/components/landing/landing-footer'
import { SOLUTIONS } from '@/lib/solutions-content'

export const metadata = { title: 'Solutions — Riscly' }

export default function SolutionsPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <LandingNav />
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Solutions</p>
        <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight">Riscly for your team and your goals.</h1>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {Object.entries(SOLUTIONS).map(([slug, s]) => (
            <Link
              key={slug}
              href={`/solutions/${slug}`}
              className="group rounded-xl border border-border bg-panel p-5 transition-colors hover:border-primary/40"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.eyebrow}</p>
              <h2 className="mt-1 text-base font-semibold group-hover:text-primary">{s.title}</h2>
              <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{s.lead}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Learn more <ArrowRight className="size-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <LandingFooter />
    </div>
  )
}
