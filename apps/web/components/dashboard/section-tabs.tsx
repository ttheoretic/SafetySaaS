'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sectionForPath } from '@/lib/nav';
import { cn } from '@/lib/utils';

/**
 * Sub-navigation for the active section, rendered as a tab bar under the topbar.
 * Driven entirely by the current route, so individual pages need no changes.
 * Renders nothing for sections that have no sub-views.
 */
export function SectionTabs() {
  const pathname = usePathname();
  const section = sectionForPath(pathname);
  if (!section || section.tabs.length === 0) return null;

  return (
    <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <span className="mr-3 hidden text-[13px] font-medium text-foreground sm:block">{section.label}</span>
      {section.tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'relative px-3 py-2.5 text-[13px] transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </Link>
        );
      })}
    </div>
  );
}
