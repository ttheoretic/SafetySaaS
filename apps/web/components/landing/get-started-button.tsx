'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useOnboardingState } from '@/lib/use-onboarding-state'

/**
 * Landing CTA whose destination reflects how far the visitor has gotten:
 * "Get started" for anonymous visitors, "Continue setup" for signed-in users who
 * haven't bought a plan / finished onboarding, and "Open dashboard" only once
 * they're fully provisioned.
 */
export function GetStartedButton({
  className,
  showArrow = true,
}: {
  className?: string
  showArrow?: boolean
}) {
  const { nextHref, ctaLabel } = useOnboardingState()

  return (
    <Link href={nextHref} className={className}>
      {ctaLabel}
      {showArrow && <ArrowRight className="size-3.5" />}
    </Link>
  )
}
