'use client'

import { RiskScoreCard } from './risk-score-card'
import { useReliability } from '@/lib/use-project-data'

/**
 * Feeds the live RISK score into the card — the inverse of the reliability score
 * (higher reliability = lower risk), matching the header badge (100 = risky).
 */
export function OverviewScore() {
  const { score: reliability } = useReliability()
  const risk = Math.max(0, Math.min(100, 100 - Math.round(reliability)))
  return <RiskScoreCard score={risk} />
}
