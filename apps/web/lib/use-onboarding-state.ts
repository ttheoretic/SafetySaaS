'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from './auth-store'
import { api } from './api'

export type OnboardingStatus =
  | 'loading'
  | 'anonymous'
  | 'needs-billing'
  | 'needs-onboarding'
  | 'ready'

export interface OnboardingState {
  status: OnboardingStatus
  /** Where this user should go next. */
  nextHref: string
  /** Label for a "continue" CTA. */
  ctaLabel: string
}

/**
 * Resolves how far through provisioning the signed-in user is: a session alone
 * is NOT enough to reach the dashboard — they must have an active subscription
 * AND a scanned project (completed onboarding). Used by the landing CTA and the
 * dashboard guard so both agree on where a user belongs.
 */
export function useOnboardingState(): OnboardingState {
  const { token, hydrated } = useAuth()

  const query = useQuery({
    queryKey: ['onboarding-state'],
    enabled: hydrated && Boolean(token),
    retry: false,
    // Always re-verify on mount so completing billing/onboarding is reflected
    // immediately (avoids a stale "needs-onboarding" bouncing the user back).
    staleTime: 0,
    queryFn: async (): Promise<'needs-billing' | 'needs-onboarding' | 'ready'> => {
      const me = await api.me()
      if (!me.subscription.active) return 'needs-billing'
      const projects = await api.listProjects()
      if (projects.length === 0) return 'needs-onboarding'
      for (const p of projects) {
        try {
          const scans = await api.listScans(p.id)
          if (scans.some((s) => s.status === 'succeeded')) return 'ready'
        } catch {
          /* ignore and keep checking */
        }
      }
      return 'needs-onboarding'
    },
  })

  if (!hydrated || (Boolean(token) && query.isLoading)) {
    return { status: 'loading', nextHref: '/dashboard', ctaLabel: 'Continue' }
  }
  if (!token) {
    return {
      status: 'anonymous',
      nextHref: '/login?mode=signup',
      ctaLabel: 'Get started',
    }
  }
  // Couldn't verify (backend/network): don't grant the dashboard — send to billing.
  if (query.isError || !query.data) {
    return {
      status: 'needs-billing',
      nextHref: '/billing',
      ctaLabel: 'Continue setup',
    }
  }
  if (query.data === 'needs-billing') {
    return {
      status: 'needs-billing',
      nextHref: '/billing',
      ctaLabel: 'Continue setup',
    }
  }
  if (query.data === 'needs-onboarding') {
    return {
      status: 'needs-onboarding',
      nextHref: '/get-started',
      ctaLabel: 'Continue setup',
    }
  }
  return { status: 'ready', nextHref: '/dashboard', ctaLabel: 'Open dashboard' }
}
