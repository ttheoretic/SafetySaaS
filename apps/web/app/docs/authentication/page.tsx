import { DocHeader, H2, P, A, Code, Callout, ParamsTable, DocPager } from '@/components/docs/doc-primitives'
import { CodeBlock } from '@/components/docs/code-block'

export default function Authentication() {
  return (
    <>
      <DocHeader
        eyebrow="Get started"
        title="Authentication"
        lead="Riscly's API uses bearer tokens, and every request is scoped to an organization. This page shows how to authenticate and how to keep a single helper for all your calls."
      />

      <H2 id="headers">Request headers</H2>
      <P>Two headers identify and authorize each request:</P>
      <ParamsTable
        rows={[
          {
            name: 'Authorization',
            type: 'string',
            required: true,
            desc: (
              <>
                <Code>Bearer &lt;token&gt;</Code> — your session/access token. The dashboard obtains it
                from Supabase Auth; copy it from your account or sign-in session.
              </>
            ),
          },
          {
            name: 'x-org-id',
            type: 'string',
            required: true,
            desc: 'The organization (workspace) the request acts within. Returned by the /me endpoint as activeOrg.id.',
          },
          {
            name: 'Content-Type',
            type: 'string',
            desc: (
              <>
                <Code>application/json</Code> for requests with a body (POST, PATCH, PUT).
              </>
            ),
          },
        ]}
      />

      <Callout type="warn" title="Keep tokens secret">
        Tokens grant access to your code, scans and billing. Never embed them in client-side code or
        commit them to a repository — load them from environment variables or a secrets manager.
      </Callout>

      <H2 id="me">Find your org id</H2>
      <P>
        Call <Code>GET /api/me</Code> to confirm your token works and read your active organization,
        role and subscription:
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'curl',
            code: `curl https://api.riscly.com/api/me \\
  -H "Authorization: Bearer $RISCLY_TOKEN"`,
          },
          {
            label: 'Response',
            language: 'json',
            code: `{
  "user": { "id": "usr_...", "email": "you@example.com" },
  "activeOrg": { "id": "org_...", "name": "Acme", "plan": "pro" },
  "role": "owner",
  "organizations": [{ "id": "org_...", "role": "owner" }],
  "subscription": { "active": true, "status": "active", "plan": "pro" }
}`,
          },
        ]}
      />

      <H2 id="helper">A reusable helper</H2>
      <P>
        To avoid repeating headers, wrap <Code>fetch</Code> once. Every other example in these docs
        uses this <Code>riscly()</Code> helper:
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'JavaScript',
            code: `const BASE = "https://api.riscly.com/api";

export function riscly(path, init = {}) {
  return fetch(BASE + path, {
    ...init,
    headers: {
      Authorization: \`Bearer \${process.env.RISCLY_TOKEN}\`,
      "x-org-id": process.env.RISCLY_ORG_ID,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}`,
          },
          {
            label: 'Python',
            code: `import os, requests

BASE = "https://api.riscly.com/api"
SESSION = requests.Session()
SESSION.headers.update({
    "Authorization": f"Bearer {os.environ['RISCLY_TOKEN']}",
    "x-org-id": os.environ["RISCLY_ORG_ID"],
    "Content-Type": "application/json",
})

def riscly(path, **kwargs):
    return SESSION.request(kwargs.pop("method", "GET"), BASE + path, **kwargs)`,
          },
        ]}
      />

      <H2 id="errors">Errors</H2>
      <P>
        Errors return a JSON body with a <Code>message</Code> field and a standard HTTP status. A{' '}
        <Code>401</Code> means the token is missing or expired — re-authenticate. A <Code>403</Code>{' '}
        means your role or subscription does not permit the action.
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'Response',
            language: 'json',
            code: `{
  "statusCode": 401,
  "message": "Unauthorized"
}`,
          },
        ]}
      />

      <DocPager href="/docs/authentication" />
    </>
  )
}
