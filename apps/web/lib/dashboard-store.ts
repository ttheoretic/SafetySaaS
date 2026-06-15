'use client';

import { useMemo } from 'react';
import { create } from 'zustand';
import { exampleGraph, SystemGraph } from '@failsafe/shared';
import { computeDashboard, Dashboard } from './dashboard-data';

interface DashboardState {
  graph: SystemGraph;
  source: string; // 'Demo' or a project name
  setGraph: (graph: SystemGraph, source: string) => void;
  reset: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  graph: exampleGraph,
  source: 'Demo',
  setGraph: (graph, source) => set({ graph, source }),
  reset: () => set({ graph: exampleGraph, source: 'Demo' }),
}));

/** The computed dashboard for the currently-selected graph (demo or a project). */
export function useDashboard(): Dashboard {
  const graph = useDashboardStore((s) => s.graph);
  return useMemo(() => computeDashboard(graph), [graph]);
}
