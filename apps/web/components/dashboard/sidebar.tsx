'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Crosshair, FlaskConical, Network, Radio, TrendingDown,
  FileText, Users, Settings, ShieldCheck,
} from 'lucide-react';
import { AccountBadge } from '@/components/AccountBadge';
import { cn } from '@/lib/utils';

type Item = { label: string; href: string };
type Group = { label: string; icon: typeof LayoutDashboard; href: string; items?: Item[] };

const NAV: Group[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  {
    label: 'Risk Center', icon: Crosshair, href: '/risk-center',
    items: [
      { label: 'Overview', href: '/risk-center' },
      { label: 'Reliability', href: '/reliability' },
      { label: 'Security', href: '/security' },
      { label: 'Dependencies', href: '/architecture' },
      { label: 'AI Predictions', href: '/predictions' },
    ],
  },
  {
    label: 'Scenario Lab', icon: FlaskConical, href: '/scenarios',
    items: [
      { label: 'Attack Simulations', href: '/simulations' },
      { label: 'Infrastructure Failures', href: '/simulations' },
      { label: 'Revenue Impact Simulator', href: '/revenue' },
      { label: 'Custom Scenarios', href: '/scenarios' },
    ],
  },
  {
    label: 'Architecture', icon: Network, href: '/architecture',
    items: [
      { label: 'System Map', href: '/architecture' },
      { label: 'Services', href: '/architecture' },
      { label: 'Data Flow', href: '/architecture' },
      { label: 'Attack Paths', href: '/architecture' },
      { label: 'Integrations', href: '/settings' },
    ],
  },
  {
    label: 'Monitoring', icon: Radio, href: '/risk-center',
    items: [
      { label: 'Risk Feed', href: '/risk-center' },
      { label: 'Risk Timeline', href: '/risk-center' },
      { label: 'Alerts', href: '/risk-center' },
      { label: 'Continuous Scans', href: '/projects' },
    ],
  },
  {
    label: 'Business Impact', icon: TrendingDown, href: '/revenue',
    items: [
      { label: 'Revenue At Risk', href: '/revenue' },
      { label: 'Downtime Cost', href: '/downtime' },
      { label: 'SLA Impact', href: '/sla' },
      { label: 'Churn Risk', href: '/churn' },
    ],
  },
  {
    label: 'Reports', icon: FileText, href: '/reports',
    items: [
      { label: 'Executive Reports', href: '/reports' },
      { label: 'Engineering Reports', href: '/reports' },
      { label: 'Security Reports', href: '/reports' },
      { label: 'Compliance Reports', href: '/reports' },
    ],
  },
  {
    label: 'Organization', icon: Users, href: '/team',
    items: [
      { label: 'Teams', href: '/team' },
      { label: 'Members', href: '/team' },
      { label: 'Billing', href: '/settings' },
    ],
  },
  {
    label: 'Settings', icon: Settings, href: '/settings',
    items: [
      { label: 'Integrations', href: '/settings' },
      { label: 'Notifications', href: '/settings' },
      { label: 'API Keys', href: '/settings' },
      { label: 'Security', href: '/settings' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const groupActive = (g: Group) => isActive(g.href) || (g.items?.some((i) => isActive(i.href)) ?? false);

  return (
    // Reserve a 56px rail in the flow; the inner panel expands over content on hover.
    <aside className="group/sb sticky top-0 z-30 hidden h-screen w-14 shrink-0 md:block">
      <div className="absolute inset-y-0 left-0 flex h-full w-14 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out group-hover/sb:w-60 group-hover/sb:shadow-2xl group-hover/sb:shadow-black/40">
        <Link href="/dashboard" className="flex h-14 items-center gap-3 px-[18px]">
          <ShieldCheck className="size-5 shrink-0 text-primary" />
          <span className="whitespace-nowrap text-sm font-semibold text-sidebar-foreground opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
            Riscly
          </span>
        </Link>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((g) => {
            const Icon = g.icon;
            const active = groupActive(g);
            return (
              <div key={g.label} className="mb-0.5">
                <Link
                  href={g.href}
                  className={cn(
                    'flex h-9 items-center gap-3 rounded-md px-[10px] text-sm transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', active && 'text-primary')} />
                  <span className="whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
                    {g.label}
                  </span>
                </Link>

                {g.items && (
                  <div className="hidden pb-1 pl-[34px] pr-1 pt-0.5 group-hover/sb:block">
                    {g.items.map((it) => {
                      const sub = pathname === it.href;
                      return (
                        <Link
                          key={it.label}
                          href={it.href}
                          className={cn(
                            'block whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] transition-colors',
                            sub
                              ? 'text-primary'
                              : 'text-muted-foreground hover:text-sidebar-foreground',
                          )}
                        >
                          {it.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <AccountBadge />
        </div>
      </div>
    </aside>
  );
}
