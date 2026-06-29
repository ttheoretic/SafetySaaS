import { MarketingShell, MH2 } from '@/components/marketing/page-shell'

export const metadata = { title: 'Careers — Riscly' }

export default function CareersPage() {
  return (
    <MarketingShell
      eyebrow="Company"
      title="Careers"
      lead="We’re a small, early team building security and architecture intelligence for software teams everywhere."
    >
      <MH2>Open roles</MH2>
      <p>
        We don’t have any open positions right now. We hire occasionally as the
        product grows — usually engineers who care about correctness, security and
        clear product thinking.
      </p>

      <MH2>Stay in touch</MH2>
      <p>
        If you’re excited about what we’re building and want to be considered for
        future roles, send a short note and a link to your work to{' '}
        <a href="mailto:careers@riscly.app" className="text-primary hover:underline">
          careers@riscly.app
        </a>
        . We read everything, even when nothing is posted.
      </p>
    </MarketingShell>
  )
}
