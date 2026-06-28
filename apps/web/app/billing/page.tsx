'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check, Loader2, ShieldCheck, LogOut } from 'lucide-react'
import { type Plan } from '@riscly/shared'
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
  const [canceled, setCanceled] = useState(false)
  // The score the user already earned for free — shown to anchor the paywall.
  const [teaser, setTeaser] = useState<{ risk: number; critical: number } | null>(null)

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
        if (m.subscription.active) {
          router.replace('/portfolio')
          return
        }
        setMe(m)
        // Pull the score they already earned for free, to anchor the paywall.
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
          <h1 className="text-2xl font-semibold">Unlock your full results</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your risk score is free. Subscribe to see every finding, its exact
            location and an AI-generated fix.
          </p>
        </div>

        {teaser && (
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

        {canceled && (
          <p className="mb-6 rounded-lg border border-high/40 bg-high/10 px-4 py-3 text-center text-sm text-high">
            Checkout was canceled — pick a plan whenever you&rsquo;re ready.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {CHECKOUT_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-6 ${
                plan.highlight ? 'border-primary' : 'border-border'
              } bg-card`}
            >
              {plan.highlight && (
                <span className="mb-2 inline-block w-fit rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-mono text-3xl font-semibold">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {plan.priceSuffix}
                </span>
              </div>
              <p className="mt-2 min-h-10 text-sm text-muted-foreground">
                {plan.tagline}
              </p>
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
                onClick={() => subscribe(plan.id as Plan)}
                disabled={!!busy}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy === plan.id && <Loader2 className="size-4 animate-spin" />}
                Subscribe
              </button>
            </div>
          ))}
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
