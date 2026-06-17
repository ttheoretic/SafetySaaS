'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { AccountBadge } from '@/components/AccountBadge';
import { SECTIONS } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    // Reserve a 56px rail; the inner panel expands over content on hover. The
    // shell is fixed-height so this stays put while the main area scrolls.
    <aside className="group/sb relative z-30 hidden h-full w-14 shrink-0 md:block">
      <div className="absolute inset-y-0 left-0 flex h-full w-14 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out group-hover/sb:w-60 group-hover/sb:shadow-2xl group-hover/sb:shadow-black/40">
        <Link href="/dashboard" className="flex h-14 items-center gap-3 px-[18px]">
          <ShieldCheck className="size-5 shrink-0 text-primary" />
          <span className="whitespace-nowrap text-sm font-semibold text-sidebar-foreground opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
            Riscly
          </span>
        </Link>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = isActive(s.href);
            return (
              <Link
                key={s.label}
                href={s.href}
                className={cn(
                  'mb-0.5 flex h-9 items-center gap-3 rounded-md px-[10px] text-sm transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                )}
              >
                <Icon className={cn('size-4 shrink-0', active && 'text-primary')} />
                <span className="whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
                  {s.label}
                </span>
              </Link>
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

