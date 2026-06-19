import { TrendingDown } from 'lucide-react'
import { Panel } from '@/components/ui/panel'

export function RiskScoreCard({ score, trend }: { score: number; trend: number }) {
  const radius = 52
  const circ = 2 * Math.PI * radius
  const pct = score / 100
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
            stroke="var(--critical)"
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
      <div className="mt-3 flex items-center gap-1.5 rounded-sm bg-ok/10 px-2 py-1 font-mono text-xs text-ok">
        <TrendingDown className="size-3.5" />
        {trend} pts this week
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Elevated — 3 exploitable risks in production
      </p>
    </Panel>
  )
}
