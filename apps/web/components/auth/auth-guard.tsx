'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'

/**
 * Gate for the authenticated dashboard chrome. Waits for the auth store to
 * hydrate from localStorage, then redirects unauthenticated users to /login.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { token, hydrated } = useAuth()

  useEffect(() => {
    if (hydrated && !token) router.replace('/login')
  }, [hydrated, token, router])

  if (!hydrated || !token) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
