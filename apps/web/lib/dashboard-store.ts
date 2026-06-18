'use client';

import { useMemo } from 'react';
import { create } from 'zustand';
import { exampleGraph, exampleBusiness, SystemGraph, BusinessContext } from '@riscly/shared';
import { computeDashboard, Dashboard } from './dashboard-data';

const BUSINESS_KEY = 'riscly.business';

function loadBusiness(): BusinessContext {
  if (typeof window === 'undefined') return exampleBusiness;
  try {
    const raw = localStorage.getItem(BUSINESS_KEY);
    if (raw) return { ...exampleBusiness, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return exampleBusiness;
}

interface DashboardState {
  graph: SystemGraph;
  source: string; // 'Demo' or a project name
  business: BusinessContext;
  setGraph: (graph: SystemGraph, source: string) => void;
  setBusiness: (business: BusinessContext) => void;
  reset: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  graph: exampleGraph,
  source: 'Demo',
  business: loadBusiness(),
  setGraph: (graph, source) => set({ graph, source }),
  setBusiness: (business) => {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(BUSINESS_KEY, JSON.stringify(business)); } catch { /* ignore */ }
    }
    set({ business });
  },
  reset: () => set({ graph: exampleGraph, source: 'Demo' }),
}));

/** The computed dashboard for the currently-selected graph + business context. */
export function useDashboard(): Dashboard {
  const graph = useDashboardStore((s) => s.graph);
  const business = useDashboardStore((s) => s.business);
  return useMemo(() => computeDashboard(graph, business), [graph, business]);
}

/** Read the active system graph directly (for pages that run their own engines). */
export function useSystemGraph(): SystemGraph {
  return useDashboardStore((s) => s.graph);
}

/** Read the active business context directly. */
export function useBusiness(): BusinessContext {
  return useDashboardStore((s) => s.business);
}
