'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Loader2, ShieldCheck, LogOut } from 'lucide-react'
import {
  PLAN_LIMITS,
  AI_TIER_LABEL_LONG,
  MONITORING_LABEL,
  type Plan,
} from '@riscly/shared'
import { api, type MeResponse } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'

/** Build the feature bullets for a plan from the shared limits config. */
function featuresFor(plan: Plan): string[] {
  const l = PLAN_LIMITS[plan]
  const members =
    l.maxMembers === Infinity
      ? 'Unlimited members'
      : `Up to ${l.maxMembers} members`
  return [
    AI_TIER_LABEL_LONG[l.aiTier],
    `${MONITORING_LABEL[l.monitoring]} monitoring`,
    ...(l.scenarioLab ? ['Scenario Lab'] : []),
    ...(l.revenueImpact ? ['Revenue impact scoring'] : []),
    ...(l.reports ? ['PDF & Excel reports'] : []),
    members,
  ]
}

export default function BillingPage() {
  const router = useRouter()
  const { token, hydrated, signOut } = useAuth()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [busy, setBusy] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [canceled, setCanceled] = useState(false)

  useEffect(() => {
    if (!hydrated) return
    if (!token) {
      router.replace('/login')
      return
    }
    setCanceled(
      new URLSearchParams(window.location.search).get('canceled') === '1',
    )
    api
      .me()
      .then((m) => {
        // Already subscribed → no reason to sit on the paywall.
        if (m.subscription.active) router.replace('/dashboard')
        else setMe(m)
      })
      .catch(() => {})
  }, [hydrated, token, router])

  async function subscribe(plan: Plan) {
    setBusy(plan)
    setError(null)
    try {
      const { url } = await api.checkout(plan)
      window.location.href = url
    } catch (err) {
      setError((err as Error).message)
      setBusy(null)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-5xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
            <ShieldCheck className="size-3.5" /> Choose a plan to unlock Riscly
          </div>
          <h1 className="text-2xl font-semibold">Activate your workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Riscly needs an active subscription. Pick a plan to start analyzing
            your architecture.
          </p>
        </div>

        {canceled && (
          <p className="mb-6 rounded-lg border border-high/40 bg-high/10 px-4 py-3 text-center text-sm text-high">
            Checkout was canceled — pick a plan whenever you&rsquo;re ready.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {(['starter', 'growth', 'pro'] as Plan[]).map((plan) => {
            const limits = PLAN_LIMITS[plan]
            return (
              <div
                key={plan}
                className={`flex flex-col rounded-2xl border p-6 ${
                  plan === 'growth' ? 'border-primary' : 'border-border'
                } bg-card`}
              >
                {plan === 'growth' && (
                  <span className="mb-2 inline-block w-fit rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                    Most popular
                  </span>
                )}
                <h2 className="text-lg font-semibold capitalize">{plan}</h2>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-semibold">
                    €{limits.priceEur}
                  </span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                  {featuresFor(plan).map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="size-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => subscribe(plan)}
                  disabled={!!busy}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {busy === plan && <Loader2 className="size-4 animate-spin" />}
                  Subscribe
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <a
            href="mailto:sales@riscly.ai"
            className="text-primary hover:underline"
          >
            Talk to us about Enterprise
          </a>
          <span className="text-border">·</span>
          <button
            onClick={() => {
              signOut()
              router.replace('/login')
            }}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
        {error && <p className="mt-4 text-center text-sm text-high">{error}</p>}
        {!me && !error && (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading your account…
          </p>
        )}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            ← Back to riscly.ai
          </Link>
        </p>
      </div>
    </div>
  )
}
