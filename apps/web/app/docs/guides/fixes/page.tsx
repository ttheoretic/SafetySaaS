import { DocHeader, H2, P, OL, A, Code, Callout, DocPager } from '@/components/docs/doc-primitives'
import { CodeBlock } from '@/components/docs/code-block'

export default function FixesGuide() {
  return (
    <>
      <DocHeader
        eyebrow="Guides"
        title="Risks & one-click fixes"
        lead="For any finding that is located in code, Riscly can generate a fix, explain why it works, and commit it directly to your repository — no manual PR juggling."
      />

      <H2 id="flow">The fix flow</H2>
      <OL>
        <li><strong>Preview.</strong> Generate the fix and an explanation without changing anything (<Code>code/fix</Code>).</li>
        <li><strong>Review.</strong> Read the explanation, the corrected code, tips and references.</li>
        <li><strong>Apply.</strong> Commit the fix directly to the default branch (<Code>code/fix/commit</Code>). You get a link to the commit.</li>
      </OL>

      <Callout type="warn" title="Always review before applying">
        Automated fixes are suggestions. Riscly cannot guarantee it catches or correctly fixes every
        issue — review and test each change before relying on it. Responsibility for your systems
        stays with you (see the <A href="/legal/terms">Terms</A>).
      </Callout>

      <H2 id="preview">1. Preview a fix</H2>
      <P>
        Pass the located finding (file, rule, title). The response contains the original snippet, the
        proposed <Code>fixed</Code> code and a human-readable <Code>explanation</Code>.
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'JavaScript',
            code: `const preview = await riscly(\`/projects/\${projectId}/code/fix\`, {
  method: "POST",
  body: JSON.stringify({
    file: "src/server/auth.ts",
    line: 42,
    rule: "no-hardcoded-secret",
    title: "Hardcoded credential",
    description: "A secret is committed in source.",
  }),
}).then((r) => r.json());

console.log(preview.explanation);
console.log(preview.fixed); // null if no automated fix was possible`,
          },
          {
            label: 'Response',
            language: 'json',
            code: `{
  "original": "const KEY = \\"...\\";",
  "fixed": "const KEY = process.env.KEY;",
  "explanation": "Move the secret to an environment variable...",
  "aiEnabled": true
}`,
          },
        ]}
      />

      <H2 id="apply">2. Apply the fix (direct commit)</H2>
      <P>
        Applying commits the corrected file straight to the repository's default branch and returns
        the commit URL. No pull request window, no branch switching.
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'JavaScript',
            code: `const result = await riscly(\`/projects/\${projectId}/code/fix/commit\`, {
  method: "POST",
  body: JSON.stringify({
    file: "src/server/auth.ts",
    line: 42,
    rule: "no-hardcoded-secret",
    title: "Hardcoded credential",
  }),
}).then((r) => r.json());

console.log("Pushed:", result.url); // commit html_url`,
          },
        ]}
      />

      <Callout type="info" title="Prefer a pull request?">
        A PR-based variant (<Code>code/fix/pr</Code>) opens a branch and pull request instead of
        committing directly. See the <A href="/docs/api/code">Code &amp; fixes</A> reference.
      </Callout>

      <DocPager href="/docs/guides/fixes" />
    </>
  )
}
