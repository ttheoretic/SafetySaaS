'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'
import { AuthGuard } from '@/components/auth/auth-guard'

// Public marketing routes — rendered full-bleed, no chrome, no auth.
// '/' is the marketing landing page; the dashboard lives under /dashboard.
const MARKETING_ROUTES = ['/', '/pricing']
// Auth-flow routes — full-bleed, no chrome; they manage their own auth/redirects.
const AUTH_ROUTES = ['/login', '/get-started', '/billing']

function matches(routes: string[], pathname: string) {
  return routes.some((r) => pathname === r || pathname.startsWith(`${r}/`))
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Bare routes render without the dashboard sidebar / top nav.
  if (matches(MARKETING_ROUTES, pathname) || matches(AUTH_ROUTES, pathname)) {
    return (
      <div className="min-h-dvh bg-background text-foreground">{children}</div>
    )
  }

  // Everything else is the authenticated dashboard.
  return (
    <AuthGuard>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav />
          <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}
