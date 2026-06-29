import { DocHeader, H2, P, A, Code, Callout, Endpoint, ParamsTable, DocPager } from '@/components/docs/doc-primitives'
import { CodeBlock } from '@/components/docs/code-block'

export default function AnalysisApi() {
  return (
    <>
      <DocHeader
        eyebrow="API reference"
        title="Analysis"
        lead="Stateless analysis endpoints that operate on an architecture graph you supply — reliability, security, simulation, prediction and reporting."
      />

      <Callout type="info" title="Graph in, analysis out">
        These endpoints take a <Code>graph</Code> (the architecture, as produced by a scan) in the
        request body. Read the latest graph from{' '}
        <A href="/docs/api/scans">a scan</A> and pass it here.
      </Callout>

      <H2 id="reliability">Reliability</H2>
      <Endpoint method="POST" path="/api/analyze/reliability" />
      <P>Returns a score, weighted findings and prioritized recommendations.</P>
      <CodeBlock
        tabs={[
          { label: 'curl', code: `curl -X POST https://api.riscly.com/api/analyze/reliability \\
  -H "Authorization: Bearer $RISCLY_TOKEN" \\
  -H "x-org-id: $RISCLY_ORG_ID" \\
  -H "Content-Type: application/json" \\
  -d '{"graph": { "nodes": [], "edges": [] }}'` },
          { label: 'Response', language: 'json', code: `{
  "score": 82,
  "findings": [
    { "category": "redundancy", "severity": "high",
      "title": "Single database instance", "weight": 0.4 }
  ],
  "recommendations": [
    { "title": "Add a read replica", "priority": "high",
      "riskReductionPct": 30, "fix": "..." }
  ],
  "summary": { "high": 1, "medium": 2 }
}` },
        ]}
      />

      <H2 id="security">Security</H2>
      <Endpoint method="POST" path="/api/analyze/security" />
      <P>Like reliability, plus an <Code>exposures</Code> array of externally reachable risks.</P>

      <H2 id="simulate">Simulate</H2>
      <Endpoint method="POST" path="/api/analyze/simulate" />
      <ParamsTable
        rows={[
          { name: 'graph', type: 'object', required: true, desc: 'The architecture graph.' },
          { name: 'type', type: 'string', required: true, desc: <>Simulation type, e.g. <Code>node-outage</Code>.</> },
          { name: 'params', type: 'object', desc: 'Type-specific parameters, e.g. the node to fail.' },
          { name: 'business', type: 'object', desc: 'Business context to express impact in money.' },
          { name: 'durationHours', type: 'number', desc: 'Outage window; defaults to 1.' },
        ]}
      />

      <H2 id="predict">Predict</H2>
      <Endpoint method="POST" path="/api/analyze/predict" />
      <P>AI failure prediction over a graph. Pass an optional <Code>currentUsers</Code> for scale-aware results.</P>

      <H2 id="report">Report</H2>
      <Endpoint method="POST" path="/api/analyze/report" />
      <P>Generates a consolidated report from a graph and optional business context.</P>

      <DocPager href="/docs/api/analysis" />
    </>
  )
}
