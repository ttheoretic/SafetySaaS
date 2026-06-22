'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth, ONBOARDING_STATUS_KEY } from './auth-store'
import { api } from './api'

export type OnboardingStatus =
  | 'loading'
  | 'anonymous'
  | 'needs-billing'
  | 'needs-onboarding'
  | 'ready'

type ResolvedStatus = 'needs-billing' | 'needs-onboarding' | 'ready'

export interface OnboardingState {
  /** Confirmed status — what guards act on. 'loading' until verified. */
  status: OnboardingStatus
  /** Optimistic destination for a "continue" CTA. */
  nextHref: string
  /** Optimistic label for a "continue" CTA. */
  ctaLabel: string
}

const MAP: Record<ResolvedStatus, { nextHref: string; ctaLabel: string }> = {
  'needs-billing': { nextHref: '/billing', ctaLabel: 'Continue setup' },
  'needs-onboarding': { nextHref: '/get-started', ctaLabel: 'Continue setup' },
  ready: { nextHref: '/dashboard', ctaLabel: 'Open dashboard' },
}

function readCached(): ResolvedStatus | null {
  if (typeof window === 'undefined') return null
  const v = localStorage.getItem(ONBOARDING_STATUS_KEY)
  return v === 'needs-billing' || v === 'needs-onboarding' || v === 'ready'
    ? v
    : null
}

function writeCached(s: ResolvedStatus) {
  if (typeof window !== 'undefined') localStorage.setItem(ONBOARDING_STATUS_KEY, s)
}

/**
 * Resolves how far through provisioning the signed-in user is: a session alone
 * is NOT enough to reach the dashboard — they need an active subscription AND a
 * scanned project. Used by the landing CTA and the dashboard guard.
 *
 * Robust by design:
 * - A transient /me failure never downgrades a paid user to the paywall — only
 *   an observed inactive subscription does. On error the guard simply waits.
 * - An expired token (401) is cleared by the API client → the user goes to
 *   /login, not /billing.
 * - The last known status is cached, so the CTA shows the right label instantly
 *   on reload instead of a "Continue" flash.
 */
export function useOnboardingState(): OnboardingState {
  const { token, hydrated } = useAuth()

  const query = useQuery({
    queryKey: ['onboarding-state'],
    enabled: hydrated && Boolean(token),
    retry: 1,
    staleTime: 10_000,
    queryFn: async (): Promise<ResolvedStatus> => {
      const me = await api.me()
      let status: ResolvedStatus
      if (!me.subscription.active) {
        status = 'needs-billing'
      } else {
        const projects = await api.listProjects()
        status = 'needs-onboarding'
        for (const p of projects) {
          try {
            const scans = await api.listScans(p.id)
            if (scans.some((s) => s.status === 'succeeded')) {
              status = 'ready'
              break
            }
          } catch {
            /* ignore and keep checking */
          }
        }
      }
      writeCached(status)
      return status
    },
  })

  // Optimistic value (for the CTA only): fresh result, else last-known cache.
  const optimistic = query.data ?? readCached()
  const cta = optimistic ? MAP[optimistic] : { nextHref: '/dashboard', ctaLabel: 'Continue' }

  if (!hydrated) {
    return { status: 'loading', nextHref: cta.nextHref, ctaLabel: cta.ctaLabel }
  }
  if (!token) {
    return {
      status: 'anonymous',
      nextHref: '/login?mode=signup',
      ctaLabel: 'Get started',
    }
  }
  // Guards act ONLY on a confirmed (freshly fetched) status — never on the
  // optimistic cache or on an error — so a blip can't bounce a paid user.
  const status: OnboardingStatus = query.data ?? 'loading'
  return { status, nextHref: cta.nextHref, ctaLabel: cta.ctaLabel }
}
