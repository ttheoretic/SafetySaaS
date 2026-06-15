import { Star } from 'lucide-react';

const quotes = [
  {
    quote: 'FailSafe AI flagged a database single point of failure two weeks before our Series B launch. It would have taken us down on the biggest traffic day of the year.',
    name: 'Mara Lindqvist',
    role: 'VP Engineering, Northwind',
  },
  {
    quote: 'The revenue-impact scoring changed how we prioritize reliability work. We finally fix the risks that actually cost money first.',
    name: 'Devon Park',
    role: 'CTO, Cartwheel',
  },
  {
    quote: 'It is like a chaos engineering team in a box. We run a region-failure simulation every sprint now.',
    name: 'Aisha Rahman',
    role: 'Staff SRE, Loop',
  },
];

export function Testimonials() {
  return (
    <section className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Loved by reliability teams</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Trusted where downtime isn't an option.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {quotes.map((q) => (
            <figure key={q.name} className="flex flex-col rounded-2xl border border-border/60 bg-card p-7">
              <div className="flex gap-0.5 text-primary">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}
              </div>
              <blockquote className="mt-4 flex-1 text-pretty text-sm leading-relaxed text-foreground">“{q.quote}”</blockquote>
              <figcaption className="mt-6">
                <div className="text-sm font-medium text-foreground">{q.name}</div>
                <div className="text-xs text-muted-foreground">{q.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
