'use client'

import { create } from 'zustand'

interface ActiveProjectState {
  activeProjectId: string | null
  setActiveProject: (id: string) => void
}

/**
 * The currently selected repository/project. Each repo is its own project with
 * its own data; switching here swaps every project-scoped query in the app.
 *
 * Intentionally in-memory only: the selection is NOT persisted, so every fresh
 * load starts with no active repo and the user re-picks one on the launchpad.
 * It survives in-app navigation within a session (no reload).
 */
export const useActiveProjectStore = create<ActiveProjectState>((set) => ({
  activeProjectId: null,
  setActiveProject: (id) => set({ activeProjectId: id }),
}))
