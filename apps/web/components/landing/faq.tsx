const faqs = [
  { q: 'Does FailSafe AI touch my production traffic?', a: 'No. We build a model of your system from code and infrastructure metadata, and run every simulation against that model — never against your live system.' },
  { q: 'What do I need to connect?', a: 'Start with GitHub to map your services and dependencies. Add your cloud, database and billing providers (AWS, GCP, Stripe, Supabase, Neon and more) for deeper analysis.' },
  { q: 'How fast is the first result?', a: 'Connect a repo and you get a reliability score and prioritized risks within minutes — the onboarding is designed to deliver an immediate "wow".' },
  { q: 'How do you price revenue impact?', a: 'Each simulated failure is translated into direct revenue loss, lost conversions, SLA credits and churn risk, based on your MRR and traffic — so you fix the costly risks first.' },
  { q: 'Is my data secure?', a: 'Provider tokens are encrypted at rest (AES-256-GCM), every tenant is isolated, and all mutating actions are audit-logged. SSO, RBAC and audit exports are available on higher tiers.' },
  { q: 'Can I run my own scenarios?', a: 'Yes. The Scenario Lab lets you compose multiple failures — outages, traffic surges, business shocks — and quantify the combined impact on demand.' },
];

export function Faq() {
  return (
    <section id="faq" className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <div className="text-center">
          <p className="text-sm font-medium text-primary">FAQ</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Questions, answered.
          </h2>
        </div>

        <div className="mt-12 divide-y divide-border/60">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
                <span className="font-medium text-foreground">{f.q}</span>
                <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
