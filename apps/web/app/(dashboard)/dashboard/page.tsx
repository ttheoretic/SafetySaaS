import Link from 'next/link';
import { Network } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { AiRiskSummary } from '@/components/dashboard/ai-risk-summary';
import { RevenueImpactTrends } from '@/components/dashboard/revenue-impact-trends';
import { LiveRiskFeed } from '@/components/dashboard/live-risk-feed';
import { RecommendedFixes } from '@/components/dashboard/recommended-fixes';
import { ArchitecturePreview } from '@/components/dashboard/architecture-preview';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Dashboard"
        description="Predict outages, attacks and revenue loss before your customers experience them."
        actions={
          <Link
            href="/architecture"
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground hover:opacity-90"
          >
            <Network className="size-3.5" /> Open System Map
          </Link>
        }
      />

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
