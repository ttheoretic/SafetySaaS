'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'

/**
 * Landing CTA whose destination depends on whether the visitor already has a
 * session. Returning, signed-in users get "Open dashboard"; everyone else gets
 * "Get started", which begins the sign-up + onboarding flow.
 */
export function GetStartedButton({
  className,
  showArrow = true,
}: {
  className?: string
  showArrow?: boolean
}) {
  const { token, hydrated } = useAuth()
  const authed = hydrated && Boolean(token)

  return (
    <Link
      href={authed ? '/dashboard' : '/login?mode=signup'}
      className={className}
    >
      {authed ? 'Open dashboard' : 'Get started'}
      {showArrow && <ArrowRight className="size-3.5" />}
    </Link>
  )
}
