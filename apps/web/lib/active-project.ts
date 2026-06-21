'use client'

import { create } from 'zustand'

const KEY = 'riscly.activeProject'

interface ActiveProjectState {
  activeProjectId: string | null
  setActiveProject: (id: string) => void
}

/**
 * The currently selected repository/project. Each repo is its own project with
 * its own data; switching here swaps every project-scoped query in the app.
 * Persisted so the selection survives reloads.
 */
export const useActiveProjectStore = create<ActiveProjectState>((set) => ({
  activeProjectId:
    typeof window !== 'undefined' ? localStorage.getItem(KEY) : null,
  setActiveProject: (id) => {
    if (typeof window !== 'undefined') localStorage.setItem(KEY, id)
    set({ activeProjectId: id })
  },
}))
