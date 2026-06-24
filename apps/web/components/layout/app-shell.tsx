'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'
import { AuthGuard } from '@/components/auth/auth-guard'
import { useActiveProjectStore } from '@/lib/active-project'

// Public marketing routes — rendered full-bleed, no chrome, no auth.
// '/' is the marketing landing page; the dashboard lives under /dashboard.
const MARKETING_ROUTES = ['/', '/pricing']
// Auth-flow routes — full-bleed, no chrome; they manage their own auth/redirects.
const AUTH_ROUTES = ['/login', '/get-started', '/billing']
// Launchpad — the repo picker you land on before entering a workspace. Full-bleed
// (no sidebar/top nav) but still behind the auth gate.
const LAUNCH_ROUTES = ['/portfolio']

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

  // The launchpad is full-bleed but still requires a provisioned session.
  if (matches(LAUNCH_ROUTES, pathname)) {
    return (
      <AuthGuard>
        <div className="min-h-dvh bg-background text-foreground">{children}</div>
      </AuthGuard>
    )
  }

  // Everything else is the authenticated dashboard — and requires a repo to be
  // selected on the launchpad first (the selection is not persisted across loads).
  return (
    <AuthGuard>
      <RepoGate>
        <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopNav />
            <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
          </div>
        </div>
      </RepoGate>
    </AuthGuard>
  )
}

/**
 * Bounces project-scoped pages to the launchpad when no repository is selected.
 * Because the active project is in-memory only, a fresh load has no selection,
 * so the user must re-pick on /portfolio before entering a workspace.
 */
function RepoGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const activeProjectId = useActiveProjectStore((s) => s.activeProjectId)

  useEffect(() => {
    if (!activeProjectId) router.replace('/portfolio')
  }, [activeProjectId, router])

  if (!activeProjectId) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }
  return <>{children}</>
}
