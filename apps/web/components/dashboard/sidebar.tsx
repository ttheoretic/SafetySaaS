'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderGit2, Activity, FlaskConical, Sparkles,
  Beaker, ShieldAlert, TrendingDown, FileText, Users, Settings, ShieldCheck,
} from 'lucide-react';
import { AccountBadge } from '@/components/AccountBadge';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderGit2 },
  { href: '/reliability', label: 'Reliability', icon: Activity },
  { href: '/simulations', label: 'Simulations', icon: FlaskConical },
  { href: '/predictions', label: 'AI Predictions', icon: Sparkles },
  { href: '/scenarios', label: 'Scenario Lab', icon: Beaker },
  { href: '/security', label: 'Security', icon: ShieldAlert },
  { href: '/revenue', label: 'Revenue Risk', icon: TrendingDown },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 md:flex">
      <Link href="/dashboard" className="mb-7 flex items-center gap-2 px-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
          <ShieldCheck className="size-4 text-primary" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-sidebar-foreground">FailSafe AI</div>
          <div className="text-[10px] text-muted-foreground">Find problems first</div>
        </div>
      </Link>

      <nav className="flex-1 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              }`}
            >
              <Icon className={`size-4 ${active ? 'text-primary' : ''}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 px-1">
        <AccountBadge />
      </div>
    </aside>
  );
}
