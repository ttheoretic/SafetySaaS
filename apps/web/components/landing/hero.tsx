import Link from 'next/link';
import { ArrowRight, Play, Activity } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      {/* grid + glow background (no external asset) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 size-[640px] -translate-x-1/2 -translate-y-1/3 rounded-full"
        style={{ background: 'radial-gradient(closest-side, color-mix(in oklch, var(--primary) 22%, transparent), transparent)' }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="flex size-1.5 rounded-full bg-primary" />
            Predictive reliability engine for modern SaaS
          </div>

          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            Prevent outages before your customers find them.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            FailSafe AI predicts failures, security risks, and revenue loss before they impact your business.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/get-started"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 sm:w-auto"
            >
              Analyze My Architecture
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#simulation"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary/50 sm:w-auto"
            >
              <Play className="size-4" />
              View Demo
            </a>
          </div>

          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Activity className="size-4 text-primary" />
            Trusted by reliability teams shipping to millions of users
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-4 border-t border-border/60 pt-8 text-center">
          {[
            { value: '99.99%', label: 'Uptime modeled' },
            { value: '1,200+', label: 'Failure scenarios' },
            { value: '€4.2M', label: 'Avg. risk surfaced' },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-mono text-2xl font-semibold tracking-tight md:text-3xl">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground md:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
