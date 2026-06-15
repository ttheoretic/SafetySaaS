'use client';

import Link from 'next/link';
import { LogOut, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth-store';

/** Signed-in user (or a sign-in link) at the foot of the sidebar. */
export function AccountBadge() {
  const { user, signOut, hydrated } = useAuth();

  if (!hydrated) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <UserRound className="size-4" />
        Sign in
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
          {(user.name ?? user.email).slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-foreground">{user.name ?? user.email}</div>
          <div className="truncate text-[10px] text-muted-foreground">{user.email}</div>
        </div>
      </div>
      <button
        onClick={signOut}
        className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <LogOut className="size-3" />
        Sign out
      </button>
    </div>
  );
}
