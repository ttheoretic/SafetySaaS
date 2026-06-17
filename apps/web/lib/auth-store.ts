'use client';

import { create } from 'zustand';

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  activeOrgId: string | null;
  user: SessionUser | null;
  hydrated: boolean;
  signIn: (token: string, user: SessionUser, orgId: string) => void;
  updateUser: (patch: Partial<SessionUser>) => void;
  signOut: () => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'riscly.auth';

export const useAuth = create<AuthState>((set) => ({
  token: null,
  activeOrgId: null,
  user: null,
  hydrated: false,

  signIn: (token, user, orgId) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user, orgId }));
    }
    set({ token, user, activeOrgId: orgId });
  },

  updateUser: (patch) =>
    set((state) => {
      if (!state.user) return state;
      const user = { ...state.user, ...patch };
      if (typeof window !== 'undefined' && state.token && state.activeOrgId) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ token: state.token, user, orgId: state.activeOrgId }),
        );
      }
      return { user };
    }),

  signOut: () => {
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    set({ token: null, user: null, activeOrgId: null });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return set({ hydrated: true });
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { token, user, orgId } = JSON.parse(raw);
        set({ token, user, activeOrgId: orgId, hydrated: true });
        return;
      }
    } catch {
      /* ignore */
    }
    set({ hydrated: true });
  },
}));

/** Read the current token outside React (for the API client). */
export function currentAuth(): { token: string | null; orgId: string | null } {
  const { token, activeOrgId } = useAuth.getState();
  return { token, orgId: activeOrgId };
}
