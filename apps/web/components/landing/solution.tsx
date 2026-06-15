import { Plug, ScanSearch, Gauge, ShieldCheck } from 'lucide-react';

const steps = [
  { icon: Plug, title: 'Connect', body: 'Link GitHub and your cloud, billing and database providers in a couple of clicks.' },
  { icon: ScanSearch, title: 'Scan', body: 'We build a live dependency graph of your whole system — services, data, queues, APIs.' },
  { icon: Gauge, title: 'Simulate', body: 'Run outages, surges and security attacks against the model — never against production.' },
  { icon: ShieldCheck, title: 'Fix first', body: 'Get a reliability score, prioritized risks and the exact fixes that move it the most.' },
];

export function Solution() {
  return (
    <section className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">The solution</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Find problems before they happen.
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            FailSafe AI builds a model of your system and stress-tests the future — so you fix the
            risk while it's still cheap.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-xl border border-border/60 bg-card p-6">
              <span className="absolute right-5 top-5 font-mono text-xs text-muted-foreground">0{i + 1}</span>
              <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-medium text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
