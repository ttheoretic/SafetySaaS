import { DocHeader, H2, P, A, Code, Endpoint, DocPager } from '@/components/docs/doc-primitives'
import { CodeBlock } from '@/components/docs/code-block'

export default function BillingApi() {
  return (
    <>
      <DocHeader
        eyebrow="API reference"
        title="Billing"
        lead="Read the current plan, usage and limits, start a checkout, or open the Stripe customer portal to manage the subscription."
      />

      <H2 id="get">Current plan & usage</H2>
      <Endpoint method="GET" path="/api/billing" />
      <CodeBlock
        tabs={[
          { label: 'curl', code: `curl https://api.riscly.com/api/billing \\
  -H "Authorization: Bearer $RISCLY_TOKEN" \\
  -H "x-org-id: $RISCLY_ORG_ID"` },
          { label: 'Response', language: 'json', code: `{
  "plan": "pro",
  "provider": "stripe",
  "limits": { "projects": 25, "members": 10, "scansPerDay": 100 },
  "usage": { "projects": 4, "members": 3, "scansToday": 12 }
}` },
        ]}
      />

      <H2 id="details">Invoices & payment method</H2>
      <Endpoint method="GET" path="/api/billing/details" />
      <P>Returns recent invoices (with download URLs) and the card on file.</P>

      <H2 id="checkout">Start a checkout</H2>
      <Endpoint method="POST" path="/api/billing/checkout" />
      <P>Returns a Stripe Checkout <Code>url</Code> to redirect the user to for upgrading.</P>
      <CodeBlock
        tabs={[
          { label: 'JavaScript', code: `const { url } = await riscly("/billing/checkout", {
  method: "POST",
  body: JSON.stringify({ plan: "pro" }),
}).then((r) => r.json());

window.location.href = url;` },
        ]}
      />

      <H2 id="portal">Customer portal</H2>
      <Endpoint method="POST" path="/api/billing/portal" />
      <P>Returns a Stripe customer-portal <Code>url</Code> to change plan, update the card or cancel.</P>

      <H2 id="confirm">Confirm a checkout</H2>
      <Endpoint method="POST" path="/api/billing/confirm" />
      <P>
        Call on return from Checkout with the <Code>sessionId</Code> so access is granted immediately
        rather than waiting for the webhook.
      </P>

      <DocPager href="/docs/api/billing" />
    </>
  )
}
