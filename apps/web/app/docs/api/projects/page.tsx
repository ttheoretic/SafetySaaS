import { DocHeader, H2, P, A, Code, Endpoint, ParamsTable, DocPager } from '@/components/docs/doc-primitives'
import { CodeBlock } from '@/components/docs/code-block'

export default function ProjectsApi() {
  return (
    <>
      <DocHeader
        eyebrow="API reference"
        title="Projects"
        lead="A project is a unit of analysis — usually one repository or app. It owns connections, scans, business context and the architecture overlay."
      />

      <H2 id="list">List projects</H2>
      <Endpoint method="GET" path="/api/projects" />
      <CodeBlock
        tabs={[
          { label: 'curl', code: `curl https://api.riscly.com/api/projects \\
  -H "Authorization: Bearer $RISCLY_TOKEN" \\
  -H "x-org-id: $RISCLY_ORG_ID"` },
          { label: 'Response', language: 'json', code: `[
  { "id": "prj_a1", "name": "web", "environment": "production" },
  { "id": "prj_b2", "name": "api", "environment": "production" }
]` },
        ]}
      />

      <H2 id="create">Create a project</H2>
      <Endpoint method="POST" path="/api/projects" />
      <ParamsTable rows={[{ name: 'name', type: 'string', required: true, desc: 'Display name, often the repo it will be attached to.' }]} />
      <CodeBlock
        tabs={[
          { label: 'curl', code: `curl -X POST https://api.riscly.com/api/projects \\
  -H "Authorization: Bearer $RISCLY_TOKEN" \\
  -H "x-org-id: $RISCLY_ORG_ID" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"my-app"}'` },
          { label: 'Response', language: 'json', code: `{ "id": "prj_c3", "name": "my-app" }` },
        ]}
      />

      <H2 id="rename">Rename a project</H2>
      <Endpoint method="PATCH" path="/api/projects/{projectId}" />
      <CodeBlock tabs={[{ label: 'curl', code: `curl -X PATCH https://api.riscly.com/api/projects/PROJECT_ID \\
  -H "Authorization: Bearer $RISCLY_TOKEN" \\
  -H "x-org-id: $RISCLY_ORG_ID" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"renamed"}'` }]} />

      <H2 id="files">Files & commits</H2>
      <P>Browse the repo file tree and read individual files for the code explorer.</P>
      <Endpoint method="GET" path="/api/projects/{projectId}/files?repo={repo}" />
      <Endpoint method="GET" path="/api/projects/{projectId}/files/content?repo={repo}&path={path}" />
      <Endpoint method="GET" path="/api/projects/{projectId}/commits?limit=8" />

      <H2 id="business">Business context</H2>
      <P>
        Revenue and usage that drive money-denominated impact (see{' '}
        <A href="/docs/guides/reliability">Reliability &amp; simulation</A>).
      </P>
      <Endpoint method="GET" path="/api/projects/{projectId}/business" />
      <Endpoint method="PUT" path="/api/projects/{projectId}/business" />
      <ParamsTable
        rows={[
          { name: 'monthlyRevenue', type: 'number', required: true, desc: 'Monthly recurring revenue.' },
          { name: 'activeUsers', type: 'number', required: true, desc: 'Active users in the period.' },
          { name: 'currency', type: 'string', desc: 'ISO currency code, e.g. EUR.' },
          { name: 'peakCheckoutShare', type: 'number', desc: 'Share of revenue at peak (0–1), for sharper outage math.' },
        ]}
      />

      <H2 id="overlay">Architecture overlay</H2>
      <P>Your manual corrections to the auto-detected graph; persisted across scans.</P>
      <Endpoint method="GET" path="/api/projects/{projectId}/architecture-overlay" />
      <Endpoint method="PUT" path="/api/projects/{projectId}/architecture-overlay" />

      <DocPager href="/docs/api/projects" />
    </>
  )
}
