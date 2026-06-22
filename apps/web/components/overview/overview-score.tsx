'use client'

import { Loader2, ScanLine } from 'lucide-react'
import { Panel } from '@/components/ui/panel'
import { RiskScoreCard } from './risk-score-card'
import { useReliability } from '@/lib/use-project-data'

/**
 * Feeds the live RISK score into the card — the inverse of the reliability score
 * (higher reliability = lower risk), matching the header badge (100 = risky).
 * Shows an empty state until the project has a scan.
 */
export function OverviewScore() {
  const { score: reliability, loading } = useReliability()

  if (reliability == null) {
    return (
      <Panel className="items-center justify-center gap-2 p-5 text-center">
        {loading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <ScanLine className="size-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              Run a scan to get your risk score
            </p>
          </>
        )}
      </Panel>
    )
  }

  const risk = Math.max(0, Math.min(100, 100 - Math.round(reliability)))
  return <RiskScoreCard score={risk} />
}
