'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'

// Routes that render outside the dashboard chrome (no sidebar / top nav).
const BARE_ROUTES = ['/landing', '/pricing']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isBare = BARE_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  )

  if (isBare) {
    return <div className="min-h-dvh bg-background text-foreground">{children}</div>
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
