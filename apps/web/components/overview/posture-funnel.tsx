import { GitBranch, Rocket, Bug, ShieldOff } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/panel'

const stages = [
  { label: 'Default branch', value: 129, pct: 100, icon: GitBranch, tone: 'bg-ok' },
  { label: 'In production', value: 45, pct: 35, icon: Rocket, tone: 'bg-medium' },
  { label: 'Exploit available', value: 8, pct: 17.8, icon: Bug, tone: 'bg-high' },
  { label: 'Internet exposed', value: 3, pct: 6, icon: ShieldOff, tone: 'bg-critical' },
]

export function PostureFunnel() {
  return (
    <Panel className="flex-1">
      <PanelHeader title="Risk reduction — branch to production" />
      <div className="p-4">
        <p className="mb-4 text-xs text-muted-foreground">
          Prioritize the risks that actually reach production and are exploitable.
        </p>
        <div className="grid grid-cols-4 gap-3">
          {stages.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Icon className="size-3.5" />
                  <span className="text-[11px]">{s.label}</span>
                </div>
                <span className="font-mono text-2xl font-semibold tabular-nums">
                  {s.value}
                </span>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${s.tone}`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {s.pct}% of branch
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
          <span className="text-muted-foreground">
            82.2% of production risks have no known exploit
          </span>
          <span className="font-mono text-critical">3 require immediate action</span>
        </div>
      </div>
    </Panel>
  )
}
