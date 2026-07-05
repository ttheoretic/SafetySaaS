import { OverviewHeader } from '@/components/overview/overview-header'
import { OverviewScore } from '@/components/overview/overview-score'
import { KpiRow } from '@/components/overview/kpi-row'
import { RiskTrendPanel } from '@/components/overview/risk-trend-panel'
import {
  CriticalRisksPanel,
  RecentChangesPanel,
} from '@/components/overview/overview-panels'

// Dense overview: compact KPI strip, score + risk-over-time chart, then the
// actionable lists. The severity breakdown lives on /risks (facets), not here.
export default function OverviewPage() {
  return (
    <div className="flex h-full flex-col">
      <OverviewHeader />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <KpiRow />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
            <OverviewScore />
            <RiskTrendPanel />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CriticalRisksPanel />
            <RecentChangesPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
