'use client';

import { usePathname } from 'next/navigation';
import { Search, Bell, Circle } from 'lucide-react';

const TITLES: Record<string, string> = {
  '/': 'Overview',
  '/projects': 'Projects',
  '/reliability': 'Reliability Score',
  '/simulations': 'Failure Simulations',
  '/predictions': 'AI Failure Prediction',
  '/scenarios': 'Scenario Laboratory',
  '/security': 'Security',
  '/revenue': 'Revenue Risk',
  '/reports': 'Reports',
  '/team': 'Team Management',
  '/settings': 'Settings',
  '/login': 'Sign in',
};

export function Topbar() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? 'FailSafe AI';
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-medium text-foreground">{title}</h1>
        <span className="hidden items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground sm:flex">
          <Circle className="size-2 fill-primary text-primary" />
          Acme SaaS · production
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground md:flex">
          <Search className="size-3.5" />
          Search…
        </div>
        <button className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground">
          <Bell className="size-4" />
        </button>
      </div>
    </header>
  );
}
