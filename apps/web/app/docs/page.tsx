import Link from 'next/link'
import {
  ShieldCheck,
  Rocket,
  Plug,
  ScanSearch,
  WandSparkles,
  Lock,
  CreditCard,
  CircleHelp,
} from 'lucide-react'

export const metadata = {
  title: 'Documentation — Riscly',
  description:
    'Getting started, integrations, scanning, fixes, data & security, and billing for Riscly.',
}

type Section = {
  icon: React.ComponentType<{ className?: string }>
  title: string
  blurb: string
  items: { q: string; a: React.ReactNode }[]
}

const SECTIONS: Section[] = [
  {
    icon: Rocket,
    title: 'Getting started',
    blurb: 'From sign-up to your first risk map in a few minutes.',
    items: [
      {
        q: 'Create an account',
        a: 'Sign up with email and a password, or use Google / GitHub single sign-on. You can start on the free tier with your first project — no card required.',
      },
      {
        q: 'Connect a repository',
        a: 'On Get started, connect a GitHub or GitLab repository. Riscly reads it (read-only) to infer your architecture, dependencies and potential risks.',
      },
      {
        q: 'Run your first scan',
        a: 'Start a scan from the project. When it completes you get an architecture map, a prioritized risk list and an overall posture score. Scans can run in the background — the page updates when results are ready.',
      },
    ],
  },
  {
    icon: Plug,
    title: 'Integrations',
    blurb: 'Connect the systems that make up your product.',
    items: [
      {
        q: 'Source code',
        a: 'GitHub and GitLab. We request the minimum scope needed to read repository contents and (for fixes) to commit changes you explicitly approve.',
      },
      {
        q: 'Cloud & services',
        a: 'Connect providers such as Vercel, Supabase or AWS to enrich the map with real infrastructure. Access is read-only configuration data.',
      },
      {
        q: 'Disconnecting',
        a: (
          <>
            You can revoke any connection anytime under{' '}
            <span className="font-medium text-foreground">Settings → Connections</span>
            . Removing a connection stops further access immediately.
          </>
        ),
      },
    ],
  },
  {
    icon: ScanSearch,
    title: 'Scanning & the architecture map',
    blurb: 'How Riscly builds the picture of your system.',
    items: [
      {
        q: 'What the map shows',
        a: 'Nodes are the components of your system — frontend, APIs, databases, queues, third-party services — connected by the data and control flows between them. Verified nodes (from a connected collector) are merged with inferred nodes so nothing is duplicated or dropped.',
      },
      {
        q: 'Confidence levels',
        a: 'Findings are labelled verified, high or heuristic so you know how much certainty sits behind each one before you act.',
      },
    ],
  },
  {
    icon: WandSparkles,
    title: 'Risks & one-click fixes',
    blurb: 'Understand a risk, then fix it directly.',
    items: [
      {
        q: 'View a fix',
        a: 'Open any code-located finding and choose View fix. Riscly explains the issue, why it matters and the concrete change — with tips and references.',
      },
      {
        q: 'Apply a fix',
        a: 'For supported findings, Apply fix commits the change directly to your repository’s default branch. You always get a link to the commit so you can review exactly what changed.',
      },
      {
        q: 'Always review',
        a: 'Automated fixes are suggestions. Review and test every change before relying on it — Riscly cannot guarantee it catches or correctly fixes everything.',
      },
    ],
  },
  {
    icon: Lock,
    title: 'Data & security',
    blurb: 'How we handle the sensitive data you connect.',
    items: [
      {
        q: 'Secrets are masked',
        a: 'Detected secrets are masked before storage. Access to connected systems is read-only wherever possible.',
      },
      {
        q: 'Your data, your control',
        a: (
          <>
            Deleting a project removes its scan and analysis data. See the{' '}
            <Link href="/legal/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>{' '}
            for processing details and the list of subprocessors, and request a DPA
            for business use.
          </>
        ),
      },
    ],
  },
  {
    icon: CreditCard,
    title: 'Billing',
    blurb: 'Plans, upgrades and invoices.',
    items: [
      {
        q: 'Plans',
        a: 'Start free with your first project and upgrade when you need more projects, scans or seats. See Pricing for the current plans.',
      },
      {
        q: 'Manage your subscription',
        a: (
          <>
            Open{' '}
            <span className="font-medium text-foreground">Settings → Billing</span> and
            choose Manage subscription to update payment details, change plan or
            download invoices through the Stripe customer portal.
          </>
        ),
      },
    ],
  },
]

const FAQ = [
  {
    q: 'Is my source code safe?',
    a: 'Access is read-only where possible and detected secrets are masked before storage. We never sell your data. See the Privacy Policy for the full picture.',
  },
  {
    q: 'Does Riscly guarantee my app is secure?',
    a: 'No. Riscly is an assistive tool. Automated analysis cannot find every issue and fixes are suggestions you must review. Security responsibility for your systems stays with you.',
  },
  {
    q: 'Can I use Riscly outside Germany / the EU?',
    a: 'Yes. Riscly is offered worldwide. International data transfers rely on EU Standard Contractual Clauses and, where certified, the EU-US Data Privacy Framework.',
  },
  {
    q: 'How do I delete my data?',
    a: 'Delete a project to remove its scan data, or contact us to delete your account. Statutory retention may apply to invoices.',
  },
]

export default function DocsPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
              <ShieldCheck className="size-3.5 text-primary" />
            </span>
            <span className="text-sm font-semibold">Riscly</span>
          </Link>
          <nav className="flex items-center gap-1 text-xs">
            <Link
              href="/legal/privacy"
              className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/legal/terms"
              className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/get-started"
              className="rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight">Documentation</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Everything you need to connect your systems, understand your risk and
            ship fixes with Riscly. Pick a topic below.
          </p>
        </div>

        {/* quick nav */}
        <div className="mt-8 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.title}
              href={`#${slug(s.title)}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <s.icon className="size-3.5 text-primary" />
              {s.title}
            </a>
          ))}
        </div>

        <div className="mt-12 space-y-12">
          {SECTIONS.map((s) => (
            <section key={s.title} id={slug(s.title)} className="scroll-mt-20">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20">
                  <s.icon className="size-4 text-primary" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">{s.title}</h2>
                  <p className="text-sm text-muted-foreground">{s.blurb}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {s.items.map((it) => (
                  <div
                    key={it.q}
                    className="rounded-lg border border-border bg-panel p-4"
                  >
                    <h3 className="text-sm font-medium">{it.q}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {it.a}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section id="faq" className="scroll-mt-20">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20">
                <CircleHelp className="size-4 text-primary" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">FAQ</h2>
                <p className="text-sm text-muted-foreground">Quick answers.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {FAQ.map((f) => (
                <div
                  key={f.q}
                  className="rounded-lg border border-border bg-panel p-4"
                >
                  <h3 className="text-sm font-medium">{f.q}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-14 rounded-xl border border-border bg-panel p-6 text-center">
          <h2 className="text-lg font-semibold">Still have questions?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Reach our team and we’ll help you get set up.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              href="/get-started"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get started
            </Link>
            <Link
              href="/legal/impressum"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact / Impressum
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
