'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check, Loader2, ShieldCheck, LogOut } from 'lucide-react'
import { PLAN_ORDER, type Plan } from '@riscly/shared'
import { api, type MeResponse } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { plans } from '@/lib/pricing-data'

// The self-serve, checkout-able plans, in the canonical pricing-table order.
const CHECKOUT_PLANS = plans.filter((p) => p.id !== 'enterprise')

export default function BillingPage() {
  const router = useRouter()
  const { token, hydrated, signOut } = useAuth()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [busy, setBusy] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [canceled, setCanceled] = useState(false)
  // The score the user already earned for free — shown to anchor the paywall.
  const [teaser, setTeaser] = useState<{ risk: number; critical: number } | null>(null)

  const currentPlan = (me?.activeOrg.plan as Plan | undefined) ?? undefined
  // Subscribed users get an OPTIONAL upgrade/downgrade page (not a paywall).
  const subscribed = Boolean(me?.subscription.active)

  async function refreshMe() {
    try {
      setMe(await api.me())
    } catch {
      /* keep last */
    }
  }

  useEffect(() => {
    if (!hydrated) return
    if (!token) {
      router.replace('/login')
      return
    }
    setCanceled(new URLSearchParams(window.location.search).get('canceled') === '1')
    api
      .me()
      .then((m) => {
        setMe(m)
        // Anchor the paywall with the free score only for not-yet-subscribed users.
        if (!m.subscription.active) {
          void (async () => {
            try {
              const projects = await api.listProjects()
              for (const p of projects) {
                const scans = (await api.listScans(p.id)) as Array<{
                  status: string
                  reliabilityScore?: number
                  findings?: Array<{ severity: string }>
                }>
                const ok = scans.find(
                  (s) => s.status === 'succeeded' && typeof s.reliabilityScore === 'number',
                )
                if (ok) {
                  const risk = Math.max(0, Math.min(100, Math.round(100 - (ok.reliabilityScore as number))))
                  const critical = (ok.findings ?? []).filter((f) => f.severity === 'critical').length
                  setTeaser({ risk, critical })
                  break
                }
              }
            } catch {
              /* teaser is best-effort */
            }
          })()
        }
      })
      .catch(() => {})
  }, [hydrated, token, router])

  async function choose(plan: Plan) {
    if (plan === currentPlan) return
    const rank = PLAN_ORDER.indexOf(plan)
    const isDowngrade = subscribed && currentPlan && rank < PLAN_ORDER.indexOf(currentPlan)
    if (isDowngrade) {
      const ok = window.confirm(
        `Downgrade to ${plan}? You keep your current features until the end of your ` +
          `billing period, then the plan changes — no immediate charge or refund.`,
      )
      if (!ok) return
    }
    setBusy(plan)
    setError(null)
    setNotice(null)
    try {
      const res = subscribed ? await api.changePlan(plan) : { mode: 'checkout' as const, url: (await api.checkout(plan)).url }
      if (res.mode === 'checkout') {
        window.location.href = res.url
        return
      }
      if (res.mode === 'immediate') {
        await refreshMe()
        setNotice(`You're now on ${plan}. New features are available right away.`)
      } else {
        const when = res.effectiveAt ? new Date(res.effectiveAt).toLocaleDateString() : 'the end of your billing period'
        setNotice(`Downgrade to ${plan} scheduled for ${when}. You keep your current features until then.`)
      }
      setBusy(null)
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
            <ShieldCheck className="size-3.5" />
            {subscribed ? 'Manage your plan' : 'Choose a plan to unlock Riscly'}
          </div>
          <h1 className="text-2xl font-semibold">
            {subscribed ? 'Your plan' : 'Unlock your full results'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {subscribed ? (
              <>
                You&rsquo;re on the{' '}
                <span className="font-medium capitalize text-foreground">{currentPlan}</span> plan.
                Upgrade for more, or downgrade — it&rsquo;s optional and takes effect at period end.
              </>
            ) : (
              'Your risk score is free. Subscribe to see every finding, its exact location and an AI-generated fix.'
            )}
          </p>
        </div>

        {teaser && !subscribed && (
          <div className="mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl border border-border bg-card px-5 py-4 text-center">
            <div>
              <span className="font-mono text-2xl font-semibold">{teaser.risk}</span>
              <span className="ml-1.5 text-sm text-muted-foreground">/ 100 risk</span>
            </div>
            {teaser.critical > 0 && (
              <div className="text-sm">
                <span className="font-semibold text-critical">{teaser.critical}</span>{' '}
                <span className="text-muted-foreground">
                  critical finding{teaser.critical === 1 ? '' : 's'} — locked
                </span>
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              Subscribe to reveal what they are and how to fix them.
            </span>
          </div>
        )}

        {notice && (
          <p className="mb-6 rounded-lg border border-ok/40 bg-ok/10 px-4 py-3 text-center text-sm text-ok">
            {notice}
          </p>
        )}
        {canceled && !notice && (
          <p className="mb-6 rounded-lg border border-high/40 bg-high/10 px-4 py-3 text-center text-sm text-high">
            Checkout was canceled — pick a plan whenever you&rsquo;re ready.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {CHECKOUT_PLANS.map((plan) => {
            const rank = PLAN_ORDER.indexOf(plan.id as Plan)
            const isCurrent = subscribed && plan.id === currentPlan
            const isUpgrade = subscribed && currentPlan && rank > PLAN_ORDER.indexOf(currentPlan)
            const cta = !subscribed
              ? 'Subscribe'
              : isCurrent
                ? 'Current plan'
                : isUpgrade
                  ? 'Upgrade'
                  : 'Downgrade'
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl border p-6 ${
                  isCurrent ? 'border-primary ring-1 ring-primary/30' : plan.highlight ? 'border-primary' : 'border-border'
                } bg-card`}
              >
                {isCurrent ? (
                  <span className="mb-2 inline-block w-fit rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                    Current plan
                  </span>
                ) : plan.highlight ? (
                  <span className="mb-2 inline-block w-fit rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                    Most popular
                  </span>
                ) : null}
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-semibold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.priceSuffix}</span>
                </div>
                <p className="mt-2 min-h-10 text-sm text-muted-foreground">{plan.tagline}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {plan.aiModel} AI model
                  </li>
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => choose(plan.id as Plan)}
                  disabled={Boolean(busy) || isCurrent}
                  className={`mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-50 ${
                    isCurrent
                      ? 'border border-primary/30 bg-primary/10 text-primary'
                      : isUpgrade || !subscribed
                        ? 'bg-primary text-primary-foreground hover:opacity-90'
                        : 'border border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {busy === plan.id && <Loader2 className="size-4 animate-spin" />}
                  {isCurrent && <Check className="size-4" />}
                  {cta}
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-muted-foreground/40"
          >
            Compare all plans &amp; features <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          {subscribed ? (
            <Link href="/portfolio" className="inline-flex items-center gap-1 hover:text-foreground">
              <ArrowRight className="size-3.5" /> Back to dashboard
            </Link>
          ) : (
            <>
              <a href="mailto:sales@riscly.ai" className="text-primary hover:underline">
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
            </>
          )}
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
