'use client'

import { useQuery } from '@tanstack/react-query'
import type { Plan, PlanLimits } from '@riscly/shared'
import { api } from './api'
import { useAuth } from './auth-store'
import { gateForPath, meetsReq, type GateReq } from './plan-gating'

/**
 * The active org's plan + entitlements, cached across the app. `can()` answers
 * whether a feature/requirement is unlocked. While the plan is still loading,
 * gates should show a spinner rather than guess.
 */
export function usePlan() {
  const token = useAuth((s) => s.token)
  const q = useQuery({
    queryKey: ['billing'],
    queryFn: () => api.billing(),
    enabled: Boolean(token),
    staleTime: 60_000,
  })
  const plan = q.data?.plan as Plan | undefined
  const limits = q.data?.limits as PlanLimits | undefined
  const loaded = Boolean(plan && limits)

  const can = (req: GateReq): boolean =>
    loaded ? meetsReq(plan!, limits!, req) : true

  /** True only once we KNOW the plan does not include the path's feature. */
  const isPathLocked = (pathname: string): boolean => {
    const gate = gateForPath(pathname)
    if (!gate || !loaded) return false
    return !meetsReq(plan!, limits!, gate.req)
  }

  return { plan, limits, loading: q.isLoading, loaded, can, isPathLocked }
}
