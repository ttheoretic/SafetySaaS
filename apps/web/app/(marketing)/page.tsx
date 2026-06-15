import { Hero } from '@/components/landing/hero';
import { Problem } from '@/components/landing/problem';
import { Solution } from '@/components/landing/solution';
import { Architecture } from '@/components/landing/architecture';
import { SimulationDemo } from '@/components/landing/simulation-demo';
import { RevenueDemo } from '@/components/landing/revenue-demo';
import { Features } from '@/components/landing/features';
import { Testimonials } from '@/components/landing/testimonials';
import { Pricing } from '@/components/landing/pricing';
import { Faq } from '@/components/landing/faq';
import { Footer } from '@/components/landing/footer';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Problem />
      <Solution />
      <Architecture />
      <SimulationDemo />
      <RevenueDemo />
      <Features />
      <Testimonials />
      <Pricing />
      <Faq />
      <Footer />
    </>
  );
}
