import { StatCards } from '@/components/dashboard/stat-cards';
import { ReliabilityScore } from '@/components/dashboard/reliability-score';
import { ScenarioLab } from '@/components/dashboard/scenario-lab';
import { SystemMap } from '@/components/dashboard/system-map';
import { Vulnerabilities } from '@/components/dashboard/vulnerabilities';
import { RevenueImpact } from '@/components/dashboard/revenue-impact';
import { AiAnalysis } from '@/components/dashboard/ai-analysis';

export default function Page() {
  return (
    <>
      <StatCards />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <ReliabilityScore />
        </div>
        <div className="xl:col-span-2">
          <ScenarioLab />
        </div>
      </div>

      <SystemMap />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Vulnerabilities />
        </div>
        <div className="xl:col-span-1">
          <RevenueImpact />
        </div>
      </div>

      <AiAnalysis />
    </>
  );
}
