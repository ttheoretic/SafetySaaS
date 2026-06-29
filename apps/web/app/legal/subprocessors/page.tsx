'use client'

import { LegalShell, H2, P } from '@/components/legal/legal-shell'

type Row = { name: string; purpose: string; location: string }

const ROWS: Row[] = [
  { name: 'Supabase', purpose: 'Authentication & database', location: 'USA' },
  { name: 'Render', purpose: 'Application / API hosting', location: 'USA' },
  { name: 'Vercel', purpose: 'Frontend hosting & delivery', location: 'USA' },
  { name: 'Stripe', purpose: 'Payment processing', location: 'USA / Ireland (EU)' },
  { name: 'Resend', purpose: 'Transactional email delivery', location: 'USA' },
  { name: 'Anthropic', purpose: 'AI analysis & code fixes (when enabled)', location: 'USA' },
  { name: 'GitHub / GitLab', purpose: 'Source code access (when connected)', location: 'USA / global' },
  { name: 'OSV.dev (Google)', purpose: 'Known-vulnerability data', location: 'USA' },
  { name: 'AWS (if you connect it)', purpose: 'Read-only cloud configuration', location: 'Your selected region' },
]

export default function SubprocessorsPage() {
  return (
    <LegalShell title="Subprocessors" updated="[DATUM]">
      <P>
        Riscly uses the following subprocessors to provide the Service. They
        process personal data on our behalf under data processing agreements
        (Art. 28 GDPR). This list is part of our{' '}
        <a href="/legal/privacy" className="text-primary hover:underline">
          Privacy Policy
        </a>
        ; we update it when subprocessors change.
      </P>

      <div className="mt-6 overflow-hidden rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-medium">Subprocessor</th>
              <th className="px-3 py-2 font-medium">Purpose</th>
              <th className="px-3 py-2 font-medium">Location</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.name} className="border-b border-border align-top last:border-0">
                <td className="px-3 py-2.5 font-medium text-foreground">{r.name}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{r.purpose}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{r.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H2>International transfers</H2>
      <P>
        Where a subprocessor is located outside the EU/EEA, transfers rely on the
        EU Standard Contractual Clauses and, where certified, the EU-US Data Privacy
        Framework, with appropriate supplementary measures.
      </P>

      <H2>Notice of changes</H2>
      <P>
        We maintain this page as the current record of subprocessors. Business
        customers with a Data Processing Agreement can request advance notice of new
        subprocessors at datenschutz@riscly.app.
      </P>
    </LegalShell>
  )
}
