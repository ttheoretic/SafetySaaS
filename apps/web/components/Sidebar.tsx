'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/projects', label: 'Projects' },
  { href: '/reliability', label: 'Reliability Score' },
  { href: '/simulations', label: 'Simulations' },
  { href: '/security', label: 'Security' },
  { href: '/revenue', label: 'Revenue Risk' },
  { href: '/reports', label: 'Reports' },
  { href: '/team', label: 'Team' },
  { href: '/settings', label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-panel px-4 py-6">
      <div className="mb-8 px-2">
        <div className="text-lg font-semibold text-white">FailSafe AI</div>
        <div className="text-xs text-muted">Find problems before they happen.</div>
      </div>
      <nav className="space-y-1">
        {NAV.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm transition ${
                active
                  ? 'bg-accent text-white'
                  : 'text-slate-300 hover:bg-panel2'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
