import { DocHeader, H2, P, OL, UL, A, Code, Callout, DocPager } from '@/components/docs/doc-primitives'
import { CodeBlock } from '@/components/docs/code-block'

export default function Quickstart() {
  return (
    <>
      <DocHeader
        eyebrow="Get started"
        title="Quickstart"
        lead="Connect a repository and get a full architecture and risk report in a few minutes — no card required for your first project."
      />

      <H2 id="dashboard">Option A — in the dashboard</H2>
      <OL>
        <li>
          <strong>Create an account.</strong> Sign up with email and a password, or use{' '}
          <A href="/get-started">Google / GitHub single sign-on</A>.
        </li>
        <li>
          <strong>Connect a repository.</strong> On <em>Get started</em>, authorize GitHub or GitLab.
          Riscly requests the minimum scope needed to read repository contents.
        </li>
        <li>
          <strong>Run a scan.</strong> Start a scan from the project. It infers your architecture and
          runs SAST, dependency and secret analysis.
        </li>
        <li>
          <strong>Review &amp; fix.</strong> Open the architecture map and the risk list. For any
          code-located finding, choose <em>View fix</em>, then <em>Apply fix</em> to push it to your repo.
        </li>
      </OL>

      <Callout type="tip" title="First project is free">
        You can run your first project on the free tier. Upgrade when you need more projects, scans
        or seats — see <A href="/pricing">Pricing</A>.
      </Callout>

      <H2 id="api">Option B — via the API</H2>
      <P>
        Prefer automation? The same flow works over the REST API. First grab your token and org id
        (see <A href="/docs/authentication">Authentication</A>), then:
      </P>

      <P><strong>1. Create a project</strong></P>
      <CodeBlock
        tabs={[
          {
            label: 'curl',
            code: `curl -X POST https://api.riscly.com/api/projects \\
  -H "Authorization: Bearer $RISCLY_TOKEN" \\
  -H "x-org-id: $RISCLY_ORG_ID" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"my-app"}'`,
          },
          {
            label: 'JavaScript',
            code: `const project = await riscly("/projects", {
  method: "POST",
  body: JSON.stringify({ name: "my-app" }),
}).then((r) => r.json());`,
          },
        ]}
      />

      <P><strong>2. Start a scan and poll until it finishes</strong></P>
      <CodeBlock
        tabs={[
          {
            label: 'JavaScript',
            code: `// kick off the scan
const scan = await riscly(\`/projects/\${project.id}/scans\`, {
  method: "POST",
  body: "{}",
}).then((r) => r.json());

// scans can run in the background — poll the list until done
async function waitForScan(projectId, scanId) {
  while (true) {
    const scans = await riscly(\`/projects/\${projectId}/scans\`).then((r) => r.json());
    const s = scans.find((x) => x.id === scanId);
    if (s && (s.status === "succeeded" || s.status === "failed")) return s;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

const done = await waitForScan(project.id, scan.id);
console.log("posture score:", done.reliabilityScore);`,
          },
        ]}
      />

      <Callout type="info" title="The riscly() helper">
        The examples use a small wrapper that adds the auth headers. You can define it once — see the{' '}
        <A href="/docs/authentication">Authentication</A> page.
      </Callout>

      <H2 id="next">Next steps</H2>
      <UL>
        <li><A href="/docs/guides/connect">Connect a repository</A> — providers and scopes.</li>
        <li><A href="/docs/guides/fixes">Risks &amp; one-click fixes</A> — review and apply fixes.</li>
        <li><A href="/docs/api">API reference</A> — every endpoint with examples.</li>
      </UL>

      <DocPager href="/docs/quickstart" />
    </>
  )
}
