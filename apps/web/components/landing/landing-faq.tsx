import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    q: 'How does Riscly connect to my codebase?',
    a: 'Riscly connects through a read-only GitHub or GitLab app — there is no agent to install. It builds a live map of your services, dependencies and infrastructure, then runs continuous SAST, SCA, secret and IaC scanning on every push.',
  },
  {
    q: 'Which AI model powers the fixes on my plan?',
    a: 'Every plan uses Anthropic Claude for contextual remediation. Starter runs on Claude Haiku, Growth on Claude Sonnet, and Pro on Claude Opus for the deepest reasoning. Enterprise adds fine-tuning on your private code patterns.',
  },
  {
    q: 'Does Riscly use my source code to train models?',
    a: 'No. Your source code is never used to train shared or third-party models. Code is processed only to generate analysis and fixes for your own organization, and is encrypted in transit and at rest.',
  },
  {
    q: 'What counts toward my repository and scan limits?',
    a: 'Limits are based on connected repositories and monthly scans. A scan runs automatically on each push to a tracked branch, plus any manual scans you trigger. You can see live usage in your billing settings at any time.',
  },
  {
    q: 'Can I change or cancel my plan later?',
    a: 'Yes. You can upgrade, downgrade or cancel at any time from billing settings. Upgrades take effect immediately and downgrades apply at the start of your next billing cycle — no long-term contract is required on Starter, Growth or Pro.',
  },
  {
    q: 'How are the AI-suggested fixes applied?',
    a: 'Fixes are proposed as reviewable diffs inside the console. You can inspect the blast radius in the simulation lab, edit the patch, and ship it as a pull request to your repository. Nothing is merged without your approval.',
  },
  {
    q: 'What does the Enterprise plan add?',
    a: 'Enterprise includes unlimited repositories and seats, fine-tuned Claude models on your private patterns, SSO/SAML, audit logging, custom data residency, and a dedicated support channel with an SLA. Pricing is tailored to your organization.',
  },
]

export function LandingFaq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-primary">
          FAQ
        </p>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h2>
        <p className="mt-3 text-pretty text-muted-foreground">
          Everything you need to know about scanning, fixes, billing and security.
        </p>
      </div>

      <div className="mt-12 flex flex-col gap-3">
        {faqs.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border border-border bg-panel px-5 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-medium">
              {item.q}
              <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}
