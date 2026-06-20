'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { useOnboardingState } from '@/lib/use-onboarding-state'

/**
 * Gate for the authenticated dashboard. A session alone is not enough: users
 * only reach the dashboard once they have an active subscription AND a scanned
 * project (completed onboarding). Anyone short of that is routed to the right
 * step (/login → /billing → /get-started).
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { token, hydrated } = useAuth()
  const { status, nextHref } = useOnboardingState()

  useEffect(() => {
    if (!hydrated) return
    if (!token) {
      router.replace('/login')
      return
    }
    // Send unprovisioned users to billing / onboarding rather than the dashboard.
    if (status === 'needs-billing' || status === 'needs-onboarding') {
      router.replace(nextHref)
    }
  }, [hydrated, token, status, nextHref, router])

  if (!hydrated || !token || status === 'loading' || status !== 'ready') {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
