import { DocHeader, H2, P, A, Code, Endpoint, ParamsTable, DocPager } from '@/components/docs/doc-primitives'
import { CodeBlock } from '@/components/docs/code-block'

export default function ConnectionsApi() {
  return (
    <>
      <DocHeader
        eyebrow="API reference"
        title="Connections"
        lead="Connections attach providers (source, cloud, services) to a project. Secrets are masked before storage. See the guide for the full flow."
      />

      <H2 id="list">List connections</H2>
      <Endpoint method="GET" path="/api/projects/{projectId}/connections" />
      <CodeBlock
        tabs={[
          { label: 'Response', language: 'json', code: `[
  {
    "id": "con_1",
    "provider": "github",
    "status": "active",
    "metadata": { "repos": ["acme/web"] },
    "createdAt": "2026-06-29T10:00:00.000Z"
  }
]` },
        ]}
      />

      <H2 id="create">Create a connection (token)</H2>
      <Endpoint method="POST" path="/api/projects/{projectId}/connections" />
      <ParamsTable
        rows={[
          { name: 'provider', type: 'string', required: true, desc: <>e.g. <Code>vercel</Code>, <Code>supabase</Code>, <Code>aws</Code>, <Code>gitlab</Code>.</> },
          { name: 'token', type: 'string', desc: 'API token / key for token-based providers (masked before storage).' },
          { name: 'metadata', type: 'object', desc: 'Non-secret config, e.g. which repos/projects to scan.' },
        ]}
      />

      <H2 id="oauth">OAuth authorize URL</H2>
      <Endpoint method="GET" path="/api/oauth/{provider}/authorize?projectId={projectId}" />
      <P>
        Returns a <Code>url</Code> to redirect the user through the provider's consent screen. Used for
        GitHub and GitLab. See <A href="/docs/guides/connect">Connect a repository</A>.
      </P>

      <H2 id="update">Update connection metadata</H2>
      <Endpoint method="PATCH" path="/api/projects/{projectId}/connections/{connectionId}" />
      <P>Merge non-secret config — for example, scoping a Vercel org token to selected projects.</P>

      <H2 id="delete">Disconnect</H2>
      <Endpoint method="DELETE" path="/api/projects/{projectId}/connections/{connectionId}" />
      <P>Revokes the connection; access stops immediately.</P>
      <CodeBlock
        tabs={[
          { label: 'curl', code: `curl -X DELETE \\
  https://api.riscly.com/api/projects/PROJECT_ID/connections/CONNECTION_ID \\
  -H "Authorization: Bearer $RISCLY_TOKEN" \\
  -H "x-org-id: $RISCLY_ORG_ID"` },
          { label: 'Response', language: 'json', code: `{ "ok": true }` },
        ]}
      />

      <DocPager href="/docs/api/connections" />
    </>
  )
}
