import { Panel } from '@/components/ui/panel'

/** Risk score: 0 = safe, 100 = very risky. Same scale as the header badge. */
export function RiskScoreCard({ score }: { score: number }) {
  const radius = 52
  const circ = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, score)) / 100

  const band =
    score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low'
  const color = {
    critical: 'var(--critical)',
    high: 'var(--high)',
    medium: 'var(--medium)',
    low: 'var(--ok)',
  }[band]
  const label = {
    critical: 'Critical risk',
    high: 'Elevated risk',
    medium: 'Moderate risk',
    low: 'Low risk',
  }[band]

  return (
    <Panel className="items-center justify-center p-5">
      <div className="relative flex size-[140px] items-center justify-center">
        <svg className="size-full -rotate-90" viewBox="0 0 130 130">
          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="10"
          />
          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-mono text-4xl font-semibold tabular-nums">{score}</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Risk score
          </span>
        </div>
      </div>
      <p className="mt-3 text-center text-xs font-medium" style={{ color }}>
        {label}
      </p>
    </Panel>
  )
}
