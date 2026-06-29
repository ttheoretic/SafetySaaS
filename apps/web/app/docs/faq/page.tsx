import { DocHeader, A, DocPager } from '@/components/docs/doc-primitives'

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Is my source code safe?',
    a: (
      <>
        Access is read-only wherever possible and detected secrets are masked before storage. We never
        sell your data. See <A href="/docs/security">Data &amp; security</A> and the{' '}
        <A href="/legal/privacy">Privacy Policy</A>.
      </>
    ),
  },
  {
    q: 'Does Riscly guarantee my app is secure?',
    a: 'No. Riscly is an assistive tool. Automated analysis cannot find every issue and fixes are suggestions you must review and test. Security responsibility for your systems stays with you.',
  },
  {
    q: 'Can I use Riscly outside Germany / the EU?',
    a: 'Yes — Riscly is offered worldwide. International data transfers rely on EU Standard Contractual Clauses and, where certified, the EU-US Data Privacy Framework.',
  },
  {
    q: 'Do I need a credit card to start?',
    a: (
      <>
        No. You can run your first project on the free tier. Upgrade when you need more projects, scans
        or seats — see <A href="/pricing">Pricing</A>.
      </>
    ),
  },
  {
    q: 'How are scans billed?',
    a: 'Plans include a daily scan allowance and project/seat limits. Read your current usage and limits from the billing endpoint or Settings → Billing.',
  },
  {
    q: 'What languages and providers are supported?',
    a: (
      <>
        Source: GitHub and GitLab. Cloud &amp; services: Vercel, Supabase, AWS and more. See{' '}
        <A href="/docs/guides/connect">Connect a repository</A> for the current list.
      </>
    ),
  },
  {
    q: 'How do I delete my data?',
    a: 'Delete a project to remove its scan data, or contact us to delete your account. Statutory retention may apply to invoices.',
  },
  {
    q: 'Is there an API?',
    a: (
      <>
        Yes — the same REST API powers the dashboard. Start with{' '}
        <A href="/docs/authentication">Authentication</A> and the{' '}
        <A href="/docs/api">API reference</A>.
      </>
    ),
  },
]

export default function FaqDoc() {
  return (
    <>
      <DocHeader eyebrow="Resources" title="FAQ" lead="Quick answers to common questions." />
      <div className="mt-6 divide-y divide-border">
        {FAQ.map((f) => (
          <div key={f.q} className="py-5">
            <h2 className="text-base font-semibold text-foreground">{f.q}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{f.a}</p>
          </div>
        ))}
      </div>
      <DocPager href="/docs/faq" />
    </>
  )
}
