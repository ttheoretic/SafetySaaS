import { DocHeader, H2, P, UL, A, Code, Callout, DocPager } from '@/components/docs/doc-primitives'
import { CodeBlock } from '@/components/docs/code-block'

export default function ReliabilityGuide() {
  return (
    <>
      <DocHeader
        eyebrow="Guides"
        title="Reliability & simulation"
        lead="Beyond security, Riscly scores the reliability of your architecture and can simulate failures to estimate business impact before they happen in production."
      />

      <H2 id="reliability">Reliability analysis</H2>
      <P>
        Send an architecture graph to get a reliability score, weighted findings (single points of
        failure, missing redundancy, no backups, etc.) and prioritized recommendations with an
        estimated risk reduction.
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'JavaScript',
            code: `const report = await riscly("/analyze/reliability", {
  method: "POST",
  body: JSON.stringify({ graph }),
}).then((r) => r.json());

console.log(report.score);
for (const r of report.recommendations) {
  console.log(r.priority, r.title, \`-\${r.riskReductionPct}% risk\`);
}`,
          },
        ]}
      />

      <H2 id="business">Business context</H2>
      <P>
        Provide revenue and usage so impact is expressed in money, not abstractions. This sharpens
        both the security report and simulations.
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'JavaScript',
            code: `await riscly(\`/projects/\${projectId}/business\`, {
  method: "PUT",
  body: JSON.stringify({
    monthlyRevenue: 120000,
    activeUsers: 8000,
    currency: "EUR",
  }),
});`,
          },
        ]}
      />
      <Callout type="tip" title="Auto-fill from Stripe">
        If Stripe is connected, fetch a live MRR / active-user suggestion from{' '}
        <Code>/projects/&#123;id&#125;/business/stripe-suggestion</Code> and pre-fill the form.
      </Callout>

      <H2 id="simulate">Failure simulation</H2>
      <P>
        Simulate an outage of a component or dependency over a time window to estimate downtime and
        revenue impact.
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'JavaScript',
            code: `const result = await riscly("/analyze/simulate", {
  method: "POST",
  body: JSON.stringify({
    graph,
    type: "node-outage",
    params: { nodeId: "db-primary" },
    durationHours: 2,
  }),
}).then((r) => r.json());`,
          },
        ]}
      />

      <H2 id="predict">AI failure prediction</H2>
      <P>
        For a scanned project, get model-driven predictions of likely future failures (the model tier
        depends on your plan):
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'curl',
            code: `curl -X POST \\
  https://api.riscly.com/api/projects/PROJECT_ID/scans/predict \\
  -H "Authorization: Bearer $RISCLY_TOKEN" \\
  -H "x-org-id: $RISCLY_ORG_ID"`,
          },
        ]}
      />

      <DocPager href="/docs/guides/reliability" />
    </>
  )
}
