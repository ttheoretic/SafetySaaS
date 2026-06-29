import { DocHeader, H2, H3, P, UL, A, Code, Callout, ParamsTable, DocPager } from '@/components/docs/doc-primitives'
import { CodeBlock } from '@/components/docs/code-block'

export default function ConnectGuide() {
  return (
    <>
      <DocHeader
        eyebrow="Guides"
        title="Connect a repository"
        lead="Connections are how Riscly sees your system. Source providers feed the code analysis; cloud and service providers enrich the architecture map with real infrastructure."
      />

      <H2 id="providers">Supported providers</H2>
      <ParamsTable
        rows={[
          { name: 'github', type: 'OAuth', desc: 'Repository contents for analysis and, with your approval, committing fixes.' },
          { name: 'gitlab', type: 'OAuth / token', desc: 'GitLab repositories, including SAST/SCA/secret findings.' },
          { name: 'vercel', type: 'token', desc: 'Frontend deployments and projects (scope to selected projects).' },
          { name: 'supabase', type: 'token', desc: 'Database / auth configuration (read-only).' },
          { name: 'aws', type: 'keys', desc: 'Cloud configuration via signed (SigV4) read-only calls.' },
          { name: 'stripe', type: 'token', desc: 'Optional — live MRR / active-user signal for business impact.' },
        ]}
      />

      <H2 id="oauth">Connecting via OAuth (GitHub / GitLab)</H2>
      <P>
        In the dashboard this is a button. Programmatically, request an authorize URL for the provider
        and redirect the user to it; on completion the connection is attached to the project.
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'JavaScript',
            code: `const { url } = await riscly(
  \`/oauth/github/authorize?projectId=\${projectId}\`,
).then((r) => r.json());

// send the user to \`url\` to grant access
window.location.href = url;`,
          },
        ]}
      />
      <Callout type="tip" title="Already signed in with GitHub?">
        If the user signed in with GitHub SSO, you can skip the separate OAuth step and connect
        directly from the sign-in token — the dashboard does this automatically.
      </Callout>

      <H2 id="token">Connecting with a token</H2>
      <P>
        Providers without an OAuth flow (e.g. Vercel, Supabase, AWS) are connected with a token or key.
        Secrets are masked before storage.
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'curl',
            code: `curl -X POST https://api.riscly.com/api/projects/PROJECT_ID/connections \\
  -H "Authorization: Bearer $RISCLY_TOKEN" \\
  -H "x-org-id: $RISCLY_ORG_ID" \\
  -H "Content-Type: application/json" \\
  -d '{"provider":"vercel","token":"VERCEL_TOKEN"}'`,
          },
          {
            label: 'JavaScript',
            code: `await riscly(\`/projects/\${projectId}/connections\`, {
  method: "POST",
  body: JSON.stringify({ provider: "vercel", token: "VERCEL_TOKEN" }),
});`,
          },
        ]}
      />

      <H3 id="scope">Scoping which projects/repos are used</H3>
      <P>
        For providers that expose many projects (like a Vercel org token), store non-secret config —
        such as the selected projects — by patching the connection's metadata:
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'JavaScript',
            code: `await riscly(\`/projects/\${projectId}/connections/\${connectionId}\`, {
  method: "PATCH",
  body: JSON.stringify({ selectedProjects: ["prj_a", "prj_b"] }),
});`,
          },
        ]}
      />

      <H2 id="disconnect">Disconnecting</H2>
      <P>
        Revoke a connection anytime from <Code>Settings → Connections</Code> or via the API. Access
        stops immediately.
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'curl',
            code: `curl -X DELETE \\
  https://api.riscly.com/api/projects/PROJECT_ID/connections/CONNECTION_ID \\
  -H "Authorization: Bearer $RISCLY_TOKEN" \\
  -H "x-org-id: $RISCLY_ORG_ID"`,
          },
        ]}
      />

      <DocPager href="/docs/guides/connect" />
    </>
  )
}
