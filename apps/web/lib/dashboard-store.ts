'use client';

import { useMemo } from 'react';
import { create } from 'zustand';
import {
  exampleGraph, exampleBusiness, SystemGraph, BusinessContext,
  GraphOverlay, applyOverlay,
} from '@riscly/shared';
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
  /** Effective graph (auto-detected base + customer overlay) — what pages read. */
  graph: SystemGraph;
  /** Auto-detected graph before the overlay (for the architecture editor). */
  baseGraph: SystemGraph;
  /** The customer's manual corrections, merged into `graph`. */
  overlay: GraphOverlay;
  /** Project the current graph belongs to (null for the demo). */
  projectId: string | null;
  source: string; // 'Demo' or a project name
  business: BusinessContext;
  /** Set the auto-detected base graph (resets the overlay; load it separately). */
  setGraph: (graph: SystemGraph, source: string, projectId?: string | null) => void;
  /** Apply the customer's overlay on top of the current base graph. */
  setOverlay: (overlay: GraphOverlay) => void;
  setBusiness: (business: BusinessContext) => void;
  reset: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  graph: exampleGraph,
  baseGraph: exampleGraph,
  overlay: {},
  projectId: null,
  source: 'Demo',
  business: loadBusiness(),
  setGraph: (graph, source, projectId = null) =>
    set({ baseGraph: graph, overlay: {}, graph, source, projectId }),
  setOverlay: (overlay) =>
    set((s) => ({ overlay, graph: applyOverlay(s.baseGraph, overlay) })),
  setBusiness: (business) => {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(BUSINESS_KEY, JSON.stringify(business)); } catch { /* ignore */ }
    }
    set({ business });
  },
  reset: () => set({ graph: exampleGraph, baseGraph: exampleGraph, overlay: {}, projectId: null, source: 'Demo' }),
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
