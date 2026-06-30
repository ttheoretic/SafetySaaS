'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Settings, CreditCard, ShieldCheck, LogOut, User } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'

function initialsOf(s: string): string {
  const parts = s.trim().split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase()
}

/** Account menu: identity, quick links and sign-out. */
export function ProfileMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const token = useAuth((s) => s.token)
  const signOut = useAuth((s) => s.signOut)
  const me = useQuery({ queryKey: ['me'], queryFn: api.me, enabled: Boolean(token) })

  const name = me.data?.user.name
  const email = me.data?.user.email ?? ''
  const label = name ?? email
  const plan = me.data?.activeOrg.plan

  const go = (href: string) => { setOpen(false); router.push(href) }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-border bg-background py-1 pl-1 pr-2 hover:border-muted-foreground/40"
      >
        <span className="flex size-6 items-center justify-center rounded-sm bg-secondary font-mono text-[11px] font-semibold">
          {label ? initialsOf(label) : 'DO'}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-60 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
            <div className="border-b border-border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-md bg-secondary font-mono text-xs font-semibold">
                  {label ? initialsOf(label) : <User className="size-4" />}
                </span>
                <div className="min-w-0">
                  {name && <div className="truncate text-sm font-medium">{name}</div>}
                  <div className="truncate text-[11px] text-muted-foreground">{email}</div>
                </div>
              </div>
              {plan && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[10px] capitalize text-muted-foreground">
                  {plan} plan
                </div>
              )}
            </div>
            <div className="p-1">
              <Item icon={<Settings className="size-4" />} label="Settings" onClick={() => go('/settings')} />
              <Item icon={<CreditCard className="size-4" />} label="Billing & plan" onClick={() => go('/settings?tab=billing')} />
              {me.data?.platformAdmin && (
                <Item icon={<ShieldCheck className="size-4" />} label="Admin console" onClick={() => go('/admin')} />
              )}
            </div>
            <div className="border-t border-border p-1">
              <Item
                icon={<LogOut className="size-4" />}
                label="Sign out"
                danger
                onClick={() => { setOpen(false); signOut(); router.replace('/login') }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Item({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-accent ${
        danger ? 'text-destructive hover:bg-destructive/10' : 'text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
