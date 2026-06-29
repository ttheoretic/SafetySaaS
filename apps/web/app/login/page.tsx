'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { api } from '@/lib/api'
import { signInUser, signUpUser, signInWithProvider, requestPasswordReset } from '@/lib/sign-in'

type Mode = 'signin' | 'signup'

/** Inline GitHub mark (lucide removed brand glyphs). */
function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.32.47-2.39 1.24-3.23-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  )
}

/** Inline Google "G" mark (lucide has no brand glyph). */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.85 0-5.27-1.93-6.13-4.52H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.87 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.69-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.69 2.84C6.73 7.3 9.15 5.38 12 5.38Z" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const signIn = useAuth((s) => s.signIn)
  const [mode, setMode] = useState<Mode>('signin')

  // Landing CTAs link here with ?mode=signup to preselect the sign-up tab.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'signup') {
      setMode('signup')
    }
  }, [])

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [socialBusy, setSocialBusy] = useState<'google' | 'github' | null>(null)
  const [resetSent, setResetSent] = useState(false)

  async function forgotPassword() {
    if (!email) {
      setError('Enter your email above first, then click "Forgot password?".')
      return
    }
    setError(null)
    try {
      await requestPasswordReset(email)
      setResetSent(true)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function startSocial(provider: 'google' | 'github') {
    setSocialBusy(provider)
    setError(null)
    try {
      // Redirects away to the provider; the session is finished at /auth/callback.
      await signInWithProvider(provider)
    } catch (err) {
      setError((err as Error).message)
      setSocialBusy(null)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { token } =
        mode === 'signup'
          ? await signUpUser({ firstName, lastName, email, password })
          : await signInUser(email, password)
      // Seed the store so the /me request carries the token, then resolve the org.
      signIn(token, { id: '', email }, '')
      const me = await api.me()
      signIn(
        token,
        { id: me.user.id, email: me.user.email, name: me.user.name },
        me.activeOrg.id,
      )
      router.push(mode === 'signup' ? '/get-started' : '/portfolio')
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50'

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-16 items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">Riscly</span>
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex rounded-lg border border-border bg-card p-1 text-sm">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setError(null)
                }}
                className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
                  mode === m
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <h1 className="text-2xl font-semibold">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'signin'
              ? 'Sign in to your Riscly workspace.'
              : 'Start finding risks before your customers do.'}
          </p>

          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={() => startSocial('google')}
              disabled={socialBusy !== null}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              {socialBusy === 'google' ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => startSocial('github')}
              disabled={socialBusy !== null}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              {socialBusy === 'github' ? <Loader2 className="size-4 animate-spin" /> : <GithubIcon />}
              Continue with GitHub
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              GitHub also authorizes your repositories, so onboarding is one step shorter.
            </p>
          </div>

          <div className="my-5 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div className="flex gap-3">
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className={inputCls}
                  autoComplete="given-name"
                />
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className={inputCls}
                  autoComplete="family-name"
                />
              </div>
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={inputCls}
              autoComplete="email"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={inputCls}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />

            {mode === 'signin' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={forgotPassword}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
            {resetSent && (
              <p className="text-sm text-ok">
                Password-reset link sent — check your email.
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === 'signin'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError(null)
              }}
              className="text-primary hover:underline"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
