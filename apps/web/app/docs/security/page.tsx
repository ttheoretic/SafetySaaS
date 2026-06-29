import { DocHeader, H2, P, UL, A, Code, Callout, DocPager } from '@/components/docs/doc-primitives'

export default function SecurityDoc() {
  return (
    <>
      <DocHeader
        eyebrow="Resources"
        title="Data & security"
        lead="Riscly handles sensitive material — source code, cloud configuration and secrets. Here is how that data is accessed, stored and controlled."
      />

      <H2 id="access">Read-only by default</H2>
      <P>
        Access to connected systems is read-only wherever possible. The one exception is applying a
        fix, which writes only the file you explicitly approve — and always returns a link to the
        resulting commit so you can review exactly what changed.
      </P>

      <H2 id="secrets">Secrets are masked</H2>
      <P>
        When a scan detects a secret, the value is masked before it is stored. Riscly records that a
        secret exists and where, not the secret itself.
      </P>

      <H2 id="subprocessors">Subprocessors</H2>
      <P>
        Riscly relies on a small set of infrastructure and service providers. The full, current list —
        with their roles and locations — is maintained in the{' '}
        <A href="/legal/privacy">Privacy Policy</A>, alongside the legal bases for processing.
      </P>
      <UL>
        <li>Hosting &amp; database — Supabase, Render, Vercel</li>
        <li>Payments — Stripe</li>
        <li>Email — Resend</li>
        <li>AI analysis &amp; fixes (when enabled) — Anthropic</li>
        <li>Vulnerability data — OSV.dev</li>
      </UL>

      <H2 id="transfers">International transfers</H2>
      <P>
        Riscly is offered worldwide. Where data is transferred outside the EU, transfers rely on the
        EU Standard Contractual Clauses and, where certified, the EU-US Data Privacy Framework, with
        appropriate supplementary measures.
      </P>

      <H2 id="control">Your control</H2>
      <UL>
        <li>Disconnect any provider at any time — access stops immediately.</li>
        <li>Deleting a project removes its scan and analysis data.</li>
        <li>Request a Data Processing Agreement (DPA) for business use.</li>
        <li>Exercise your data-subject rights via the contact in the Privacy Policy.</li>
      </UL>

      <Callout type="warn" title="Riscly is an assistive tool">
        Automated analysis cannot find every vulnerability and fixes are suggestions you must review.
        Riscly provides no guarantee of security — responsibility for your systems stays with you.
        See the <A href="/legal/terms">Terms</A>.
      </Callout>

      <H2 id="more">Related</H2>
      <UL>
        <li><A href="/legal/privacy">Privacy Policy / Datenschutzerklärung</A></li>
        <li><A href="/legal/terms">Terms / AGB</A></li>
        <li><A href="/legal/impressum">Impressum</A></li>
      </UL>

      <DocPager href="/docs/security" />
    </>
  )
}
