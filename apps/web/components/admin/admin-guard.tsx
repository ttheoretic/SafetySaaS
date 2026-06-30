'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Loader2, ShieldAlert } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'

/**
 * Client gate for the admin console. The real enforcement is the server-side
 * AdminGuard on every /admin API route (a non-admin gets 403 there regardless);
 * this just keeps non-admins from seeing the chrome and bounces them to the app.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { token, hydrated } = useAuth()

  const me = useQuery({ queryKey: ['me'], queryFn: () => api.me(), enabled: Boolean(token) })
  const isAdmin = me.data?.platformAdmin === true

  useEffect(() => {
    if (hydrated && !token) router.replace('/login')
  }, [hydrated, token, router])

  useEffect(() => {
    if (me.isSuccess && !isAdmin) router.replace('/dashboard')
  }, [me.isSuccess, isAdmin, router])

  if (!hydrated || me.isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background text-center">
        <ShieldAlert className="size-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">Admin access required</p>
        <p className="text-xs text-muted-foreground">Redirecting…</p>
      </div>
    )
  }

  return <>{children}</>
}
