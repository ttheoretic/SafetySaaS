import { DocHeader, H2, P, A, Code, Callout, Endpoint, ParamsTable, DocPager } from '@/components/docs/doc-primitives'
import { CodeBlock } from '@/components/docs/code-block'

const FIX_ROWS = [
  { name: 'file', type: 'string', required: true, desc: 'Path to the file containing the finding.' },
  { name: 'rule', type: 'string', required: true, desc: 'The rule / detector that produced the finding.' },
  { name: 'title', type: 'string', required: true, desc: 'Short title of the finding.' },
  { name: 'repo', type: 'string', desc: 'Repository; resolved server-side from the project if omitted.' },
  { name: 'line', type: 'number', desc: 'Line number of the finding.' },
  { name: 'description', type: 'string', desc: 'Optional longer description to steer the fix.' },
]

export default function CodeApi() {
  return (
    <>
      <DocHeader
        eyebrow="API reference"
        title="Code & fixes"
        lead="Generate AI fixes for located findings and apply them — by committing directly to the default branch, or by opening a pull request."
      />

      <H2 id="preview">Preview a fix</H2>
      <Endpoint method="POST" path="/api/projects/{projectId}/code/fix" />
      <P>Generates the fix without changing anything. Returns the original and proposed code.</P>
      <ParamsTable rows={FIX_ROWS} />
      <CodeBlock
        tabs={[
          { label: 'Response', language: 'json', code: `{
  "original": "const KEY = \\"abc\\";",
  "fixed": "const KEY = process.env.KEY;",
  "explanation": "Move the secret to an environment variable.",
  "aiEnabled": true
}` },
        ]}
      />
      <Callout type="info" title="aiEnabled">
        When the server has no AI key, <Code>aiEnabled</Code> is <Code>false</Code> and{' '}
        <Code>fixed</Code> is <Code>null</Code> — fall back to the recommended manual fix.
      </Callout>

      <H2 id="commit">Apply a fix (direct commit)</H2>
      <Endpoint method="POST" path="/api/projects/{projectId}/code/fix/commit" />
      <P>Commits the corrected file straight to the default branch and returns the commit URL.</P>
      <CodeBlock
        tabs={[
          { label: 'curl', code: `curl -X POST \\
  https://api.riscly.com/api/projects/PROJECT_ID/code/fix/commit \\
  -H "Authorization: Bearer $RISCLY_TOKEN" \\
  -H "x-org-id: $RISCLY_ORG_ID" \\
  -H "Content-Type: application/json" \\
  -d '{"file":"src/auth.ts","line":42,"rule":"no-hardcoded-secret","title":"Hardcoded credential"}'` },
          { label: 'Response', language: 'json', code: `{
  "url": "https://github.com/acme/web/commit/abc123",
  "repo": "acme/web",
  "branch": "main"
}` },
        ]}
      />

      <H2 id="pr">Apply a fix (pull request)</H2>
      <Endpoint method="POST" path="/api/projects/{projectId}/code/fix/pr" />
      <P>Opens a branch and pull request with the corrected file instead of committing directly. Here <Code>repo</Code> is required.</P>

      <H2 id="deep-scan">Deep-scan source</H2>
      <Endpoint method="POST" path="/api/projects/{projectId}/code/deep-scan" />
      <P>
        Runs a deeper AI pass over the repo's source; new findings are merged into the scan. See the{' '}
        <A href="/docs/guides/scanning">scanning guide</A>.
      </P>

      <DocPager href="/docs/api/code" />
    </>
  )
}
