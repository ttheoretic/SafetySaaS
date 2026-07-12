'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldCheck, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DOCS_NAV } from './docs-nav'
import { RisclyMark } from '@/components/brand/logo'

function NavTree({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="space-y-6">
      {DOCS_NAV.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.links.map((l) => {
              const active = pathname === l.href
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={onNavigate}
                    className={cn(
                      'block rounded-md px-2 py-1.5 text-sm transition-colors',
                      active
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    {l.title}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function DocsSidebar() {
  const [open, setOpen] = useState(false)
  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-16 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-2.5 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <RisclyMark className="size-5" />
          <span className="text-sm font-semibold">Riscly docs</span>
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Toggle navigation"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-b border-border bg-background px-4 py-4 lg:hidden">
          <NavTree onNavigate={() => setOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-border px-3 py-5 lg:block">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2">
          <RisclyMark className="size-6" />
          <span className="text-[15px] font-semibold tracking-tight">Riscly docs</span>
        </Link>
        <NavTree />
        <div className="mt-8 border-t border-border px-2 pt-4">
          <Link
            href="/get-started"
            className="block rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get started
          </Link>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </aside>
    </>
  )
}
