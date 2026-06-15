import { AlertTriangle, Clock, DollarSign, EyeOff } from 'lucide-react';

const problems = [
  { icon: EyeOff, title: 'You find out last', body: 'Customers, social media, and your status page learn about the outage before your team does.' },
  { icon: Clock, title: 'Reactive firefighting', body: 'Pages at 3am, war rooms, and postmortems — all after the damage is already done.' },
  { icon: DollarSign, title: 'Silent revenue leaks', body: 'Failed checkouts and timeouts quietly drain MRR with no clear line back to the cause.' },
  { icon: AlertTriangle, title: 'Unknown blast radius', body: 'One dependency goes down and you have no idea what else it takes with it.' },
];

export function Problem() {
  return (
    <section id="problem" className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-destructive">The problem</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Monitoring tells you what already broke.
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Dashboards are great at the past tense. By the time an alert fires, your customers are
            already feeling the pain and revenue is already gone.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map((p) => (
            <div key={p.title} className="rounded-xl border border-border/60 bg-card p-6 transition-colors hover:border-destructive/40">
              <span className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <p.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-medium text-foreground">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
