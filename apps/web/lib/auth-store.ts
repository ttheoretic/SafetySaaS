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
  /** Update just the access token (e.g. after a Supabase refresh). */
  setToken: (token: string) => void;
  updateUser: (patch: Partial<SessionUser>) => void;
  signOut: () => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'riscly.auth';
/** Cached provisioning status; cleared on sign-out so it can't leak across users. */
export const ONBOARDING_STATUS_KEY = 'riscly.onboardingStatus';

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

  setToken: (token) =>
    set((state) => {
      // Only meaningful while signed in; refresh the persisted token in place.
      if (!state.token || token === state.token) return state;
      if (typeof window !== 'undefined' && state.user && state.activeOrgId) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ token, user: state.user, orgId: state.activeOrgId }),
        );
      }
      return { token };
    }),

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
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ONBOARDING_STATUS_KEY);
    }
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

/**
 * Called by the API client on a 401: the token is invalid/expired, so clear the
 * session. The app then routes the user to /login to re-authenticate — never to
 * the paywall.
 */
export function handleUnauthorized(): void {
  if (useAuth.getState().token) useAuth.getState().signOut();
}
