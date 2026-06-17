import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Pricing } from '@/components/landing/pricing';
import { ComparisonTable } from '@/components/landing/comparison-table';
import { Faq } from '@/components/landing/faq';
import { Footer } from '@/components/landing/footer';

export const metadata = {
  title: 'Pricing — Riscly',
  description: 'Compare Riscly plans feature by feature and pick the right tier.',
};

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-border/60 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to home
          </Link>
          <div className="mx-auto mt-8 max-w-2xl text-center">
            <p className="text-sm font-medium text-primary">Pricing</p>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Compare every plan, feature by feature.
            </h1>
            <p className="mt-4 text-muted-foreground">
              The same plans you see on the homepage — here with the full breakdown so you can
              pick the right tier with confidence.
            </p>
          </div>

          <div className="mt-12">
            <ComparisonTable />
          </div>
        </div>
      </section>

      {/* Keep the familiar pricing blocks below the comparison. */}
      <Pricing />
      <Faq />
      <Footer />
    </>
  );
}
