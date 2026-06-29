import Link from 'next/link'
import { Rocket, KeyRound, Plug, ScanSearch, WandSparkles, Terminal } from 'lucide-react'
import { DocHeader, H2, P, UL, A, Callout } from '@/components/docs/doc-primitives'
import { CodeBlock } from '@/components/docs/code-block'
import { DocPager } from '@/components/docs/doc-primitives'

const CARDS = [
  { icon: Rocket, title: 'Quickstart', desc: 'From sign-up to your first risk map in five minutes.', href: '/docs/quickstart' },
  { icon: KeyRound, title: 'Authentication', desc: 'How API requests are authenticated with tokens.', href: '/docs/authentication' },
  { icon: Plug, title: 'Connect a repository', desc: 'Wire up GitHub, GitLab and cloud providers.', href: '/docs/guides/connect' },
  { icon: ScanSearch, title: 'Scanning & the map', desc: 'How Riscly builds your architecture and finds risk.', href: '/docs/guides/scanning' },
  { icon: WandSparkles, title: 'Risks & fixes', desc: 'Understand a finding, then push a fix in one click.', href: '/docs/guides/fixes' },
  { icon: Terminal, title: 'API reference', desc: 'Every endpoint, with curl and JavaScript examples.', href: '/docs/api' },
]

export default function DocsIntro() {
  return (
    <>
      <DocHeader
        eyebrow="Documentation"
        title="Riscly documentation"
        lead="Riscly maps your system's architecture, finds security and reliability risk across your code and cloud, and ships fixes directly to your repository. These docs cover the product and the full REST API."
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-xl border border-border bg-panel p-4 transition-colors hover:border-primary/40"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20">
              <c.icon className="size-4 text-primary" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary">{c.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
      </div>

      <H2 id="how-it-works">How Riscly works</H2>
      <P>
        You connect the systems that make up your product — source repositories and, optionally,
        cloud and service providers. Riscly reads them (read-only wherever possible), infers an
        architecture graph, and runs security, dependency and reliability analysis against it. Each
        finding carries a confidence level and, where it is located in code, a one-click fix.
      </P>
      <UL>
        <li><strong>Connect</strong> — GitHub or GitLab for code; Vercel, Supabase, AWS and more for infrastructure.</li>
        <li><strong>Scan</strong> — static analysis (SAST), dependency/SBOM (SCA), secret detection and architecture inference.</li>
        <li><strong>Understand</strong> — an architecture map, a prioritized risk list and an overall posture score.</li>
        <li><strong>Fix</strong> — apply an AI-generated fix that is committed straight to your repository.</li>
      </UL>

      <H2 id="api">Talk to the API</H2>
      <P>
        Everything in the dashboard is backed by a REST API. Requests are authenticated with a bearer
        token and scoped to an organization. Here is a complete request that starts a scan:
      </P>
      <CodeBlock
        tabs={[
          {
            label: 'curl',
            code: `curl -X POST https://api.riscly.com/api/projects/PROJECT_ID/scans \\
  -H "Authorization: Bearer $RISCLY_TOKEN" \\
  -H "x-org-id: $RISCLY_ORG_ID" \\
  -H "Content-Type: application/json" \\
  -d '{}'`,
          },
          {
            label: 'JavaScript',
            code: `const res = await fetch(
  "https://api.riscly.com/api/projects/PROJECT_ID/scans",
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${process.env.RISCLY_TOKEN}\`,
      "x-org-id": process.env.RISCLY_ORG_ID,
      "Content-Type": "application/json",
    },
    body: "{}",
  },
);
const scan = await res.json();`,
          },
        ]}
      />

      <Callout type="info" title="Not sure where to start?">
        Follow the <A href="/docs/quickstart">Quickstart</A> to connect a repo and run your first scan,
        then jump into the <A href="/docs/api">API reference</A>.
      </Callout>

      <DocPager href="/docs" />
    </>
  )
}
