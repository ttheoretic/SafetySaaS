'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/legal/impressum', label: 'Impressum' },
  { href: '/legal/privacy', label: 'Datenschutz / Privacy' },
  { href: '/legal/terms', label: 'AGB / Terms' },
  { href: '/docs', label: 'Docs' },
]

/** Shared frame for legal + docs pages: brand header, section nav, an optional
 *  language toggle and a prose column. */
export function LegalShell({
  title,
  lang,
  onLang,
  updated,
  children,
}: {
  title: string
  lang?: 'de' | 'en'
  onLang?: (l: 'de' | 'en') => void
  updated?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
              <ShieldCheck className="size-3.5 text-primary" />
            </span>
            <span className="text-sm font-semibold">Riscly</span>
          </Link>
          <nav className="flex items-center gap-1 text-xs">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'rounded-md px-2 py-1 transition-colors',
                  pathname.startsWith(n.href)
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {updated && (
              <p className="mt-1 text-xs text-muted-foreground">Last updated: {updated}</p>
            )}
          </div>
          {lang && onLang && (
            <div className="flex shrink-0 overflow-hidden rounded-md border border-border text-xs">
              {(['de', 'en'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => onLang(l)}
                  className={cn(
                    'px-2.5 py-1 font-medium uppercase transition-colors',
                    lang === l ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>

        <article className="legal-prose space-y-4 text-sm leading-relaxed text-foreground/90">
          {children}
        </article>

        <p className="mt-10 border-t border-border pt-4 text-[11px] text-muted-foreground">
          This document is a template provided for convenience and is not legal
          advice. Have it reviewed by qualified counsel before relying on it.
        </p>
      </main>
    </div>
  )
}

/** Section heading inside a legal/docs page. */
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-base font-semibold text-foreground">{children}</h2>
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1 pl-5 text-muted-foreground">{children}</ul>
}
