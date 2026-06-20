'use client'

import { RiskScoreCard } from './risk-score-card'
import { useReliability } from '@/lib/use-project-data'

/** Client wrapper that feeds the live reliability score into the score card. */
export function OverviewScore() {
  const { score } = useReliability()
  return <RiskScoreCard score={score} trend={-4} />
}
