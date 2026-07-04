'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-store'
import { api } from '@/lib/api'
import { getAuthConfig } from '@/lib/auth-config'
import { getSupabase } from '@/lib/supabase'
import { RisclyMark } from '@/components/brand/logo'

/**
 * OAuth return target for social login (Google / GitHub). Supabase has placed
 * the session in the URL; we finish it: seed the store, resolve the account, and
 * — for GitHub — hand the provider token to the API so the repository
 * authorization is captured automatically (no separate connect step).
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const signIn = useAuth((s) => s.signIn)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let done = false
    ;(async () => {
      try {
        const cfg = await getAuthConfig()
        const sb = getSupabase(cfg.supabaseUrl)
        if (!sb) throw new Error('Auth is not configured.')

        // The client parses the URL on init; wait briefly if needed.
        let session = (await sb.auth.getSession()).data.session
        if (!session) {
          session = await new Promise((resolve) => {
            const { data } = sb.auth.onAuthStateChange((_e, s) => {
              if (s) {
                data.subscription.unsubscribe()
                resolve(s)
              }
            })
            setTimeout(() => {
              data.subscription.unsubscribe()
              resolve(null)
            }, 5000)
          })
        }
        if (!session) throw new Error('Sign-in did not complete. Please try again.')
        if (done) return

        const token = session.access_token
        signIn(token, { id: '', email: session.user.email ?? '' }, '')
        const me = await api.me()
        signIn(
          token,
          { id: me.user.id, email: me.user.email, name: me.user.name },
          me.activeOrg.id,
        )

        // GitHub: capture the repo authorization granted during sign-in.
        const provider = (session.user.app_metadata as { provider?: string })?.provider
        const providerToken = (session as { provider_token?: string }).provider_token
        let next = '/get-started'
        if (provider === 'github' && providerToken) {
          try {
            await api.connectGithubFromToken(providerToken)
            next = '/get-started?connected=github'
          } catch {
            /* fall back to manual connect in onboarding */
          }
        }
        router.replace(next)
      } catch (e) {
        setError((e as Error).message)
      }
    })()
    return () => {
      done = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-4 text-center text-foreground">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
        <RisclyMark className="size-5 text-primary" />
      </div>
      {error ? (
        <>
          <p className="text-sm text-destructive">{error}</p>
          <Link href="/login" className="text-sm text-primary hover:underline">
            Back to sign in
          </Link>
        </>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Finishing sign-in…
        </p>
      )}
    </div>
  )
}
