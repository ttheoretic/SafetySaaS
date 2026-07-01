import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/landing-v2/navbar'
import { Footer } from '@/components/landing-v2/footer'
import { FEATURES } from '@/lib/features-content'

export function FeatureIndex({
  category,
  base,
  title,
  lead,
}: {
  category: 'platform' | 'solutions'
  base: string
  title: string
  lead: string
}) {
  const entries = Object.entries(FEATURES).filter(([, f]) => f.category === category)
  return (
    <div className="min-h-dvh bg-background pt-16 text-foreground">
      <Navbar />
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{title}</p>
        <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight">{lead}</h1>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {entries.map(([slug, f]) => (
            <Link
              key={slug}
              href={`${base}/${slug}`}
              className="group rounded-xl border border-border bg-panel p-5 transition-colors hover:border-primary/40"
            >
              <h2 className="text-base font-semibold group-hover:text-primary">{f.title}</h2>
              <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{f.lead}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Learn more <ArrowRight className="size-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  )
}
