'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Sparkles,
  CreditCard,
  Server,
  MessageSquare,
  Settings,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdminGuard } from '@/components/admin/admin-guard'

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/ai-usage', label: 'AI Usage', icon: Sparkles },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard },
  { href: '/admin/infrastructure', label: 'Infrastructure', icon: Server },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <AdminGuard>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar">
          <div className="flex h-12 items-center gap-2 border-b border-border px-4">
            <span className="flex size-6 items-center justify-center rounded-sm bg-primary text-primary-foreground">
              <ShieldCheck className="size-4" />
            </span>
            <span className="text-sm font-semibold">Riscly</span>
            <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              Admin
            </span>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
            {NAV.map((n) => {
              const active = isActive(n.href)
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                    active
                      ? 'bg-sidebar-accent font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                  )}
                >
                  <n.icon className={cn('size-4', active && 'text-primary')} />
                  {n.label}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-border p-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Back to app
            </Link>
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
        </main>
      </div>
    </AdminGuard>
  )
}
