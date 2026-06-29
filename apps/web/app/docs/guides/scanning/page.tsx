import { DocHeader, H2, P, UL, A, Code, Callout, DocPager } from '@/components/docs/doc-primitives'
import { CodeBlock } from '@/components/docs/code-block'

export default function ScanningGuide() {
  return (
    <>
      <DocHeader
        eyebrow="Guides"
        title="Scanning & the architecture map"
        lead="A scan is what turns connected systems into an architecture graph and a prioritized risk list. This page explains what runs, what the map shows, and how confidence works."
      />

      <H2 id="what-runs">What a scan runs</H2>
      <UL>
        <li><strong>Architecture inference</strong> — components (frontend, APIs, databases, queues, third-party services) and the flows between them.</li>
        <li><strong>SAST</strong> — dataflow-based static analysis of your source, not just regex matching.</li>
        <li><strong>SCA &amp; SBOM</strong> — transitive dependency analysis and a software bill of materials, matched against known vulnerabilities (OSV.dev).</li>
        <li><strong>Secret detection</strong> — verified secret findings; detected secrets are masked before storage.</li>
      </UL>

      <H2 id="async">Scans are asynchronous</H2>
      <P>
        Starting a scan returns immediately with a status. When a job queue is configured, the scan
        runs in the background — so poll the scan list until the status is <Code>succeeded</Code> or{' '}
        <Code>failed</Code> rather than assuming results are ready.
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'JavaScript',
            code: `const scan = await riscly(\`/projects/\${projectId}/scans\`, {
  method: "POST",
  body: "{}",
}).then((r) => r.json());

let done;
do {
  await new Promise((r) => setTimeout(r, 2000));
  const scans = await riscly(\`/projects/\${projectId}/scans\`).then((r) => r.json());
  done = scans.find((s) => s.id === scan.id);
} while (done.status !== "succeeded" && done.status !== "failed");`,
          },
        ]}
      />

      <H2 id="map">Reading the architecture map</H2>
      <P>
        Nodes are components; edges are the data and control flows between them. Riscly merges{' '}
        <strong>verified</strong> nodes (from a connected collector, e.g. Vercel or Supabase) with{' '}
        <strong>inferred</strong> nodes (deduced from your code and dependencies) so that connecting a
        service after a code-only scan does not create duplicates — and nothing is dropped.
      </P>
      <Callout type="info" title="Manual corrections persist">
        Edits you make to the map are stored as an overlay on top of the auto-detected graph, so they
        survive future scans. See <A href="/docs/api/projects">architecture overlay</A> in the API reference.
      </Callout>

      <H2 id="confidence">Confidence levels</H2>
      <P>Every finding is labelled so you know how much certainty sits behind it:</P>
      <UL>
        <li><strong>verified</strong> — confirmed from a connected source or a reproduced signal.</li>
        <li><strong>high</strong> — strong evidence from analysis, low false-positive rate.</li>
        <li><strong>heuristic</strong> — inferred; worth checking before acting.</li>
      </UL>

      <H2 id="deep">Deep AI analysis</H2>
      <P>
        Optionally run a deeper AI pass over the repo's source files; the additional findings are
        merged into the scan. This requires AI to be enabled on the server.
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'curl',
            code: `curl -X POST \\
  https://api.riscly.com/api/projects/PROJECT_ID/code/deep-scan \\
  -H "Authorization: Bearer $RISCLY_TOKEN" \\
  -H "x-org-id: $RISCLY_ORG_ID"`,
          },
        ]}
      />

      <DocPager href="/docs/guides/scanning" />
    </>
  )
}
