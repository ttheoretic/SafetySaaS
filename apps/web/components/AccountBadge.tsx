'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-store';

/** Shows the signed-in user (or a sign-in link) at the foot of the sidebar. */
export function AccountBadge() {
  const { user, activeOrgId, signOut, hydrated } = useAuth();

  if (!hydrated) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="block rounded-md border border-border px-3 py-2 text-sm text-slate-300 hover:bg-panel2"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="rounded-md border border-border bg-panel2 px-3 py-2 text-sm">
      <div className="truncate text-white">{user.name ?? user.email}</div>
      <div className="truncate text-xs text-muted">{user.email}</div>
      <button
        onClick={signOut}
        className="mt-2 text-xs text-accent hover:underline"
        title={activeOrgId ?? ''}
      >
        Sign out
      </button>
    </div>
  );
}
