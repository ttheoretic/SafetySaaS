'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Network,
  ShieldAlert,
  FlaskConical,
  CodeXml,
  Bot,
  Settings,
  ShieldCheck,
  LockKeyhole,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, hint: '1' },
  { href: '/architecture', label: 'Architecture', icon: Network, hint: '2' },
  { href: '/risks', label: 'Risks', icon: ShieldAlert, hint: '3', badge: 9 },
  { href: '/security', label: 'Security', icon: LockKeyhole, hint: '4' },
  { href: '/simulation', label: 'Simulation', icon: FlaskConical, hint: '5' },
  { href: '/code', label: 'Code Analysis', icon: CodeXml, hint: '6' },
  { href: '/assistant', label: 'AI Assistant', icon: Bot, hint: '7' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    // The rail reserves a fixed 56px; the inner panel overlays and expands on hover.
    <div className="group/sb relative w-14 shrink-0">
      <aside className="absolute inset-y-0 left-0 z-40 flex w-14 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out group-hover/sb:w-56 group-hover/sb:shadow-2xl group-hover/sb:shadow-black/40">
        <div className="flex h-12 items-center gap-2 border-b border-sidebar-border px-3.5">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </div>
          <span className="whitespace-nowrap font-semibold tracking-tight opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
            Riscly
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {nav.map((item) => {
            const active =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  'group/item relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-sidebar-accent text-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon
                  className={cn(
                    'size-4 shrink-0',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
                <span className="flex-1 whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
                  {item.label}
                </span>
                {item.badge ? (
                  <span className="whitespace-nowrap rounded-sm bg-critical/15 px-1.5 font-mono text-[10px] font-semibold text-critical opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
                    {item.badge}
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-muted-foreground/50 opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
                    {item.hint}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <Link
            href="/settings"
            title="Settings"
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
              pathname.startsWith('/settings')
                ? 'bg-sidebar-accent text-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
            )}
          >
            <Settings className="size-4 shrink-0" />
            <span className="whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
              Settings
            </span>
          </Link>
          <div className="mt-2 flex items-center gap-2 rounded-md px-2.5 py-2">
            <div className="flex size-4 shrink-0 items-center justify-center">
              <span className="size-2 animate-pulse rounded-full bg-ok" />
            </div>
            <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
              Last scan 4m ago
            </span>
          </div>
        </div>
      </aside>
    </div>
  )
}
