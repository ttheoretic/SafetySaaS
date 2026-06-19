import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'
import { plans } from '@/lib/pricing-data'
import { cn } from '@/lib/utils'

export function LandingPricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-primary">
          Pricing
        </p>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Plans that scale with your risk surface
        </h2>
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
          Every plan includes architecture mapping and risk triage. Deeper
          analysis and stronger AI models unlock as you grow.
        </p>
      </div>

      {/* plan cards */}
      <div className="mt-12 grid gap-4 lg:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              'relative flex flex-col rounded-xl border bg-panel p-6',
              plan.highlight
                ? 'border-primary/50 ring-1 ring-primary/30'
                : 'border-border',
            )}
          >
            {plan.highlight && (
              <span className="absolute -top-2.5 left-6 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground">
                Most popular
              </span>
            )}

            <h3 className="text-[15px] font-semibold tracking-tight">
              {plan.name}
            </h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">
                {plan.price}
              </span>
              {plan.priceSuffix && (
                <span className="text-sm text-muted-foreground">
                  {plan.priceSuffix}
                </span>
              )}
            </div>
            <p className="mt-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
              {plan.tagline}
            </p>

            <Link
              href="/"
              className={cn(
                'mt-5 inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                plan.highlight
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border border-border bg-background hover:border-muted-foreground/40',
              )}
            >
              {plan.cta}
              {plan.highlight && <ArrowRight className="size-3.5" />}
            </Link>

            <ul className="mt-6 space-y-2.5">
              <li className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-ok" />
                <span className="leading-snug text-muted-foreground">
                  {plan.aiModel} AI model
                </span>
              </li>
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-ok" />
                  <span className="leading-snug text-muted-foreground">
                    {f}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* compare link */}
      <div className="mt-10 flex justify-center">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-panel px-4 py-2 text-sm font-medium transition-colors hover:border-muted-foreground/40"
        >
          Compare all plans & features
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  )
}
