'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ShieldCheck, Check } from 'lucide-react'
import { updatePassword } from '@/lib/sign-in'

/**
 * Set a new password. Reached from the reset link in the email — Supabase has
 * established a recovery session, so updateUser({ password }) succeeds.
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    setError(null)
    try {
      await updatePassword(password)
      setDone(true)
      setTimeout(() => router.replace('/login'), 1800)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:border-ring'

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">Riscly</span>
        </div>
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        {done ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-ok">
            <Check className="size-4" /> Password updated. Redirecting to sign in…
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className={inputCls}
              autoComplete="new-password"
            />
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              className={inputCls}
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Update password
            </button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Link href="/login" className="block text-center text-xs text-muted-foreground hover:text-foreground">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
