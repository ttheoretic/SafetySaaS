const logos = [
  'Northwind',
  'Acme Cloud',
  'Hyperscale',
  'Vertex Labs',
  'Quantal',
  'Beacon',
]

const stats = [
  { value: '509', label: 'vulnerabilities triaged per scan' },
  { value: '92%', label: 'noise filtered before reaching production' },
  { value: '4 min', label: 'median time-to-fix for critical issues' },
  { value: '14', label: 'repositories mapped continuously' },
]

export function LandingProof() {
  return (
    <section className="border-y border-border bg-panel/40">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Trusted by platform &amp; security teams
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {logos.map((l) => (
            <span
              key={l}
              className="text-base font-semibold tracking-tight text-muted-foreground/60 transition-colors hover:text-foreground"
            >
              {l}
            </span>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-panel px-5 py-6 text-center">
              <div className="font-mono text-3xl font-semibold tracking-tight text-foreground">
                {s.value}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
