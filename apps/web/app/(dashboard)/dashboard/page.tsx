import { Overview } from '@/components/dashboard/overview';
import { Vulnerabilities } from '@/components/dashboard/vulnerabilities';
import { RevenueImpact } from '@/components/dashboard/revenue-impact';
import { AiAnalysis } from '@/components/dashboard/ai-analysis';

export default function Page() {
  return (
    <>
      <Overview />

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
