'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { SIM_GROUPS } from '@/lib/simulations';

export default function SimulationsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function run() {
    if (selected) router.push(`/simulations/run?id=${encodeURIComponent(selected)}`);
  }

  return (
    <>
      <PageHeader
        title="Simulations"
        subtitle="Pick a scenario to run against your system — an attack, a failure or a growth surge — then run the simulation to see the impact."
      />

      <div className="space-y-5">
        {SIM_GROUPS.map((g) => {
          const Icon = g.icon;
          return (
            <section key={g.key} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
                  <Icon className="size-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{g.title}</h2>
                  <p className="text-xs text-muted-foreground">{g.description}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                {g.scenarios.map((s) => {
                  const isSel = selected === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelected(s.id)}
                      className={
                        'relative flex h-20 flex-col items-start justify-end rounded-xl border p-3 text-left transition-colors ' +
                        (isSel
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5')
                      }
                    >
                      {isSel && (
                        <span className="absolute right-2.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-primary">
                          <Check className="size-3 text-primary-foreground" />
                        </span>
                      )}
                      <span className="text-[13px] font-medium text-foreground">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Run bar */}
      <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/90 px-5 py-3.5 backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {selected ? (
            <>Selected: <span className="font-medium text-foreground">{labelFor(selected)}</span></>
          ) : (
            'Select a scenario to run.'
          )}
        </p>
        <button
          onClick={run}
          disabled={!selected}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Play className="size-4" /> Run Simulation
        </button>
      </div>
    </>
  );
}

function labelFor(id: string) {
  for (const g of SIM_GROUPS) {
    const s = g.scenarios.find((x) => x.id === id);
    if (s) return `${g.title} · ${s.label}`;
  }
  return id;
}
