import { DocHeader, H2, P, A, Code, Callout, ParamsTable, DocPager } from '@/components/docs/doc-primitives'
import { CodeBlock } from '@/components/docs/code-block'

export default function ApiOverview() {
  return (
    <>
      <DocHeader
        eyebrow="API reference"
        title="API overview"
        lead="A REST API over HTTPS that returns JSON. The same API powers the dashboard, so anything you can do in the product, you can automate."
      />

      <H2 id="base-url">Base URL</H2>
      <P>All endpoints are served under the <Code>/api</Code> prefix:</P>
      <CodeBlock tabs={[{ label: 'Base URL', code: 'https://api.riscly.com/api' }]} />
      <Callout type="info" title="Self-hosting / local">
        Running the API yourself? The base URL is whatever <Code>NEXT_PUBLIC_API_URL</Code> points to
        (defaults to <Code>http://localhost:4000</Code>), still with the <Code>/api</Code> prefix.
      </Callout>

      <H2 id="conventions">Conventions</H2>
      <ParamsTable
        rows={[
          { name: 'Auth', type: 'header', desc: <>Bearer token + <Code>x-org-id</Code>. See <A href="/docs/authentication">Authentication</A>.</> },
          { name: 'Format', type: 'JSON', desc: <>Request and response bodies are JSON. Send <Code>Content-Type: application/json</Code>.</> },
          { name: 'Methods', type: 'REST', desc: 'GET to read, POST to create/act, PATCH to partially update, PUT to replace, DELETE to remove.' },
          { name: 'Errors', type: 'HTTP', desc: <>Non-2xx responses carry a <Code>message</Code> field. 401 = re-auth, 403 = role/plan, 404 = not found.</> },
        ]}
      />

      <H2 id="resources">Resources</H2>
      <P>The API is organized around these resources:</P>
      <ParamsTable
        rows={[
          { name: 'Projects', type: '/projects', desc: <><A href="/docs/api/projects">Create, list, rename projects</A>; files, commits, business context and the architecture overlay.</> },
          { name: 'Scans', type: '/projects/{id}/scans', desc: <><A href="/docs/api/scans">Start scans</A>, list results, chat and predict over the latest scan.</> },
          { name: 'Code & fixes', type: '/projects/{id}/code', desc: <><A href="/docs/api/code">Preview, commit or PR an AI fix</A>; deep-scan source.</> },
          { name: 'Connections', type: '/projects/{id}/connections', desc: <><A href="/docs/api/connections">Connect, configure and disconnect</A> providers; OAuth authorize URLs.</> },
          { name: 'Analysis', type: '/analyze/*', desc: <><A href="/docs/api/analysis">Reliability, security, simulation, prediction</A> over an architecture graph.</> },
          { name: 'Billing', type: '/billing', desc: <><A href="/docs/api/billing">Plan, usage, checkout and the customer portal</A>.</> },
        ]}
      />

      <DocPager href="/docs/api" />
    </>
  )
}
