import { Activity, Brain, GitBranch, Lock, Bell, BarChart3 } from 'lucide-react';

const features = [
  { icon: GitBranch, title: 'Auto dependency mapping', body: 'Connect your stack once and get a continuously updated graph of every service relationship.' },
  { icon: Brain, title: 'AI risk analysis', body: 'Models surface the failure modes most likely to hurt, ranked and explained in plain language.' },
  { icon: Activity, title: 'Scenario lab', body: 'Run unlimited what-if simulations — traffic spikes, outages, region loss — on demand.' },
  { icon: BarChart3, title: 'Revenue impact scoring', body: 'Every risk is priced in lost revenue and projected churn so you fix the costly ones first.' },
  { icon: Lock, title: 'Security risk detection', body: 'Spot exposed surfaces and single points of failure before an attacker or an incident does.' },
  { icon: Bell, title: 'Predictive alerts', body: 'Get notified ahead of time when capacity, error budgets, or dependencies trend toward failure.' },
];

export function Features() {
  return (
    <section id="features" className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Features</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Everything you need to stay ahead of failure.
          </h2>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="bg-card p-7 transition-colors hover:bg-secondary/40">
              <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-medium text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
