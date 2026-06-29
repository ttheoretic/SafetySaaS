import { DocHeader, H2, P, A, Code, Callout, Endpoint, ParamsTable, DocPager } from '@/components/docs/doc-primitives'
import { CodeBlock } from '@/components/docs/code-block'

export default function ScansApi() {
  return (
    <>
      <DocHeader
        eyebrow="API reference"
        title="Scans"
        lead="Scans run analysis over a project's connected systems and produce an architecture graph, findings and a posture score."
      />

      <H2 id="start">Start a scan</H2>
      <Endpoint method="POST" path="/api/projects/{projectId}/scans" />
      <P>
        Returns the new scan with a <Code>status</Code>. When a queue is configured the status is{' '}
        <Code>queued</Code>/<Code>running</Code> — poll the list until it settles.
      </P>
      <CodeBlock
        tabs={[
          { label: 'curl', code: `curl -X POST https://api.riscly.com/api/projects/PROJECT_ID/scans \\
  -H "Authorization: Bearer $RISCLY_TOKEN" \\
  -H "x-org-id: $RISCLY_ORG_ID" \\
  -H "Content-Type: application/json" -d '{}'` },
          { label: 'Response', language: 'json', code: `{ "id": "scn_1", "status": "queued" }` },
        ]}
      />

      <H2 id="list">List scans</H2>
      <Endpoint method="GET" path="/api/projects/{projectId}/scans" />
      <CodeBlock
        tabs={[
          { label: 'Response', language: 'json', code: `[
  {
    "id": "scn_1",
    "status": "succeeded",
    "reliabilityScore": 82,
    "graph": { "nodes": [], "edges": [] },
    "createdAt": "2026-06-29T10:00:00.000Z"
  }
]` },
        ]}
      />
      <Callout type="tip" title="Polling">
        See the <A href="/docs/guides/scanning">scanning guide</A> for a ready-made poll-until-done loop.
      </Callout>

      <H2 id="fan-out">Fan out to multiple repos</H2>
      <P>Turn extra selected repositories into their own projects during onboarding.</P>
      <Endpoint method="POST" path="/api/projects/{projectId}/scans/fan-out" />
      <ParamsTable rows={[{ name: 'repos', type: 'string[]', required: true, desc: 'Repository identifiers to create projects for.' }]} />

      <H2 id="chat">Chat over a scan</H2>
      <P>Grounded AI chat about the project's latest scan.</P>
      <Endpoint method="POST" path="/api/projects/{projectId}/scans/chat" />
      <CodeBlock
        tabs={[
          { label: 'JavaScript', code: `const { reply } = await riscly(
  \`/projects/\${projectId}/scans/chat\`,
  {
    method: "POST",
    body: JSON.stringify({
      messages: [{ role: "user", content: "What is my biggest risk?" }],
    }),
  },
).then((r) => r.json());` },
        ]}
      />

      <H2 id="predict">Predict failures</H2>
      <Endpoint method="POST" path="/api/projects/{projectId}/scans/predict" />
      <P>Model-driven predictions over the latest scan; tier depends on plan.</P>

      <DocPager href="/docs/api/scans" />
    </>
  )
}
