'use client'

/**
 * Thin, dependency-free analytics wrapper. If PostHog is loaded on the page
 * (via the snippet / NEXT_PUBLIC_POSTHOG_KEY) it forwards events; otherwise it
 * no-ops, so instrumenting the product never requires the SDK to be present.
 *
 * Add PostHog by setting NEXT_PUBLIC_POSTHOG_KEY and loading posthog-js (or the
 * snippet) in app/layout — then every track() call below starts flowing.
 */

/** The product's canonical event taxonomy (single source of truth). */
export const ANALYTICS_EVENTS = [
  'landing_viewed',
  'pricing_viewed',
  'sign_up',
  'email_verified',
  'github_connected',
  'architecture_generated',
  'risk_viewed',
  'simulation_started',
  'simulation_completed',
  'ai_chat_used',
  'ai_fix_generated',
  'subscription_created',
  'subscription_cancelled',
] as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number]

type PostHogLike = {
  capture: (event: string, props?: Record<string, unknown>) => void
  identify: (id: string, props?: Record<string, unknown>) => void
}

function ph(): PostHogLike | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { posthog?: PostHogLike }).posthog
}

export function isAnalyticsEnabled(): boolean {
  return Boolean(ph())
}

export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  try {
    ph()?.capture(event, props)
  } catch {
    /* never let analytics break the app */
  }
}

export function identify(userId: string, props?: Record<string, unknown>): void {
  try {
    ph()?.identify(userId, props)
  } catch {
    /* ignore */
  }
}

/** Reusable hook: `const { track } = useAnalytics()`. */
export function useAnalytics() {
  return { track, identify, enabled: isAnalyticsEnabled() }
}
