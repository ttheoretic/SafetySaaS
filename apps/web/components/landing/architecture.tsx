import { Network } from 'lucide-react';
import { exampleGraph } from '@failsafe/shared';
import { SystemGraphView } from '@/components/SystemGraphView';

export function Architecture() {
  return (
    <section className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Architecture intelligence</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            See your whole system as a graph.
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            FailSafe AI maps every dependency — frontend, APIs, databases, caches, queues and third
            parties — and keeps it current as your code changes.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-border/60 bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Network className="size-4 text-primary" /> Live dependency map
          </div>
          <SystemGraphView graph={exampleGraph} />
        </div>
      </div>
    </section>
  );
}
