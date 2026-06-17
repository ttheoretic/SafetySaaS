import { KpiCards } from '@/components/dashboard/kpi-cards';
import { AiRiskSummary } from '@/components/dashboard/ai-risk-summary';
import { RevenueImpactTrends } from '@/components/dashboard/revenue-impact-trends';
import { LiveRiskFeed } from '@/components/dashboard/live-risk-feed';
import { RecommendedFixes } from '@/components/dashboard/recommended-fixes';
import { ArchitecturePreview } from '@/components/dashboard/architecture-preview';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <KpiCards />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AiRiskSummary />
        </div>
        <RevenueImpactTrends />
      </div>

      <ArchitecturePreview />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <LiveRiskFeed />
        <RecommendedFixes />
      </div>
    </div>
  );
}
