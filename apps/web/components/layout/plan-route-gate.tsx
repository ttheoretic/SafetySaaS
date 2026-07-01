'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock, Loader2, ArrowRight, Sparkles } from 'lucide-react'
import { usePlan } from '@/lib/use-plan'
import { gateForPath, minPlanForReq, planName } from '@/lib/plan-gating'

/**
 * Blocks plan-restricted routes. While the plan loads it shows a spinner (so
 * locked content never flashes); if the active plan lacks the route's feature it
 * renders an upgrade prompt instead of the page.
 */
export function PlanRouteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { plan, limits, loaded, loading, can } = usePlan()
  const gate = gateForPath(pathname)

  if (!gate) return <>{children}</>

  // Don't flash locked content while we don't yet know the plan.
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  // Plan unknown (e.g. billing fetch failed) → fail open; the backend still
  // enforces entitlements on every endpoint.
  if (!loaded || can(gate.req)) return <>{children}</>

  const need = minPlanForReq(gate.req)
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
        <Lock className="size-5 text-primary" />
      </span>
      <div>
        <h1 className="text-lg font-semibold">{gate.label} is not in your plan</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          {plan && (
            <>
              You’re on the{' '}
              <span className="font-medium text-foreground">{planName(plan)}</span> plan.{' '}
            </>
          )}
          {gate.label} unlocks on{' '}
          <span className="font-medium text-foreground">{planName(need)}</span> and above.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/settings?tab=billing"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Sparkles className="size-3.5" /> Upgrade to {planName(need)}
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Compare plans <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {limits && (
        <p className="mt-1 text-xs text-muted-foreground/70">
          Your plan still includes architecture mapping and risk triage.
        </p>
      )}
    </div>
  )
}
