import { ScanLine, FlaskConical } from 'lucide-react'
import { ScreenHeader, ActionButton } from '@/components/layout/screen-header'
import { OverviewScore } from '@/components/overview/overview-score'
import { PostureFunnel } from '@/components/overview/posture-funnel'
import {
  HealthGrid,
  CriticalRisksPanel,
  RecentChangesPanel,
} from '@/components/overview/overview-panels'

export default function OverviewPage() {
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Overview"
        subtitle="riscly / shopist-platform · main · last scan 4 minutes ago"
        actions={
          <>
            <ActionButton>
              <ScanLine className="size-3.5" />
              Run scan
            </ActionButton>
            <ActionButton variant="primary">
              <FlaskConical className="size-3.5" />
              Run simulation
            </ActionButton>
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
            <OverviewScore />
            <PostureFunnel />
          </div>

          <HealthGrid />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CriticalRisksPanel />
            <RecentChangesPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
