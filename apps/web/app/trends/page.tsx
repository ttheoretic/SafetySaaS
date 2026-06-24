import { ComingSoon } from '@/components/ui/coming-soon'

export default function TrendsPage() {
  return (
    <ComingSoon
      title="Trends"
      subtitle="Posture over time"
      summary="Track whether your risk is going up or down. Once scans accumulate history, this becomes your time series of posture."
      willInclude={[
        'Risk-score and findings-count history per repository',
        'Mean time to remediate (MTTR) and SLA adherence',
        'New vs. fixed findings over each period',
        'Regression alerts when posture worsens',
      ]}
      phase="Unlocks once scan history accumulates"
    />
  )
}
