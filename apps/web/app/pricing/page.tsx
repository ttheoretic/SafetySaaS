import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LandingNav } from '@/components/landing/landing-nav'
import { LandingFooter } from '@/components/landing/landing-footer'
import { PricingTable } from '@/components/landing/pricing-table'

export const metadata = {
  title: 'Pricing — Compare plans | Riscly',
  description:
    'Compare every Riscly plan feature by feature — usage limits, AI models, security analysis, and support.',
}

export default function PricingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Link
            href="/landing#pricing"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to plans
          </Link>

          <div className="mt-6 max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-wider text-primary">
              Compare plans
            </p>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Every feature, side by side
            </h1>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              See exactly what each plan includes — from repository limits and
              AI models to security analysis and support.
            </p>
          </div>

          <div className="mt-10">
            <PricingTable />
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  )
}
