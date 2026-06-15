'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShieldAlert, Activity, Lock, Sparkles, Network,
  FlaskConical, Beaker, TrendingDown, FileText, FolderGit2, Users, Settings,
  ShieldCheck, Crosshair, Clock, Gauge, UserMinus,
} from 'lucide-react';
import { AccountBadge } from '@/components/AccountBadge';

type Item = { href: string; label: string; icon: typeof Activity };
type Group = { label?: string; items: Item[] };

const NAV: Group[] = [
  { items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Risk Center',
    items: [
      { href: '/risk-center', label: 'All Risks', icon: Crosshair },
      { href: '/reliability', label: 'Reliability', icon: Activity },
      { href: '/security', label: 'Security', icon: Lock },
      { href: '/predictions', label: 'AI Predictions', icon: Sparkles },
    ],
  },
  {
    label: 'Architecture',
    items: [
      { href: '/architecture', label: 'System Map', icon: Network },
    ],
  },
  {
    label: 'Simulations',
    items: [
      { href: '/simulations', label: 'Failure Simulations', icon: FlaskConical },
      { href: '/scenarios', label: 'Scenario Lab', icon: Beaker },
    ],
  },
  {
    label: 'Business Impact',
    items: [
      { href: '/revenue', label: 'Revenue Risk', icon: TrendingDown },
      { href: '/downtime', label: 'Downtime Cost', icon: Clock },
      { href: '/sla', label: 'SLA Impact', icon: Gauge },
      { href: '/churn', label: 'Churn Risk', icon: UserMinus },
    ],
  },
  {
    label: 'Reports',
    items: [{ href: '/reports', label: 'Reports', icon: FileText }],
  },
  {
    label: 'Organization',
    items: [
      { href: '/projects', label: 'Projects', icon: FolderGit2 },
      { href: '/team', label: 'Team', icon: Users },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar px-3 py-5 md:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
          <ShieldCheck className="size-4 text-primary" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-sidebar-foreground">FailSafe AI</div>
          <div className="text-[10px] text-muted-foreground">Business risk intelligence</div>
        </div>
      </Link>

      <nav className="flex-1 space-y-5">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="mb-1 px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
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
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-4 px-1">
        <AccountBadge />
      </div>
    </aside>
  );
}
