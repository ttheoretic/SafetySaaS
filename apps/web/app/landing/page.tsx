import { LandingNav } from '@/components/landing/landing-nav'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingProof } from '@/components/landing/landing-proof'
import { LandingFeatures } from '@/components/landing/landing-features'
import { LandingHow } from '@/components/landing/landing-how'
import { LandingPricing } from '@/components/landing/landing-pricing'
import { LandingFaq } from '@/components/landing/landing-faq'
import { LandingCta, LandingFooter } from '@/components/landing/landing-footer'

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingProof />
        <LandingFeatures />
        <LandingHow />
        <LandingPricing />
        <LandingFaq />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
