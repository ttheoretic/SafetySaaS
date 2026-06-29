import Link from 'next/link'
import { MarketingShell, MH2 } from '@/components/marketing/page-shell'

export const metadata = { title: 'About — Riscly' }

export default function AboutPage() {
  return (
    <MarketingShell
      eyebrow="Company"
      title="About Riscly"
      lead="Riscly helps teams see the real architecture of their software, understand where the risk is, and fix it — without a security team of their own."
    >
      <p>
        Modern products are assembled from repositories, dependencies, cloud
        services and third-party APIs. The result is powerful but hard to reason
        about: no single person holds the full picture, and risk hides in the gaps
        between components. Riscly was built to close that gap.
      </p>

      <MH2>What we do</MH2>
      <p>
        We connect to your source and infrastructure (read-only wherever possible),
        infer your architecture, and run security, dependency and reliability
        analysis against it. Every finding carries a confidence level, and the ones
        located in code come with a fix you can apply in one click.
      </p>

      <MH2>Our approach</MH2>
      <p>
        Be honest about uncertainty, keep sensitive data safe, and make fixing as
        easy as finding. Riscly is an assistive tool — it does not replace your
        judgement, and we are explicit about its limits.
      </p>

      <MH2>Get in touch</MH2>
      <p>
        Riscly is operated by Theo Handschug, based in Germany and offered
        worldwide. Reach us via the <Link href="/contact" className="text-primary hover:underline">contact page</Link> or
        see the <Link href="/legal/impressum" className="text-primary hover:underline">Impressum</Link>.
      </p>
    </MarketingShell>
  )
}
