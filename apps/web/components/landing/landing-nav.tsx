'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, Menu, X } from 'lucide-react'
import { GetStartedButton } from './get-started-button'
import { MegaMenu, MOBILE_SECTIONS } from './landing-megamenu'

export function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
            <ShieldCheck className="size-4 text-primary" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Riscly</span>
        </Link>

        <MegaMenu />

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <GetStartedButton className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90" />
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-auto flex size-8 items-center justify-center rounded-md border border-border md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open && (
        <div className="max-h-[80vh] overflow-y-auto border-t border-border bg-background px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-3">
            {MOBILE_SECTIONS.map((s) => (
              <div key={s.label}>
                <div className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
                <div className="flex flex-col">
                  {s.items.map((it) => (
                    <Link
                      key={it.title}
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <it.icon className="size-4 text-primary" />
                      {it.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-col border-t border-border pt-2">
              <Link href="/docs" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">Docs</Link>
              <Link href="/pricing" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">Pricing</Link>
              <Link href="/login" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">Sign in</Link>
            </div>
            <GetStartedButton className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground" />
          </nav>
        </div>
      )}
    </header>
  )
}
