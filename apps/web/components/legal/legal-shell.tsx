'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/landing-v2/navbar'
import { Footer } from '@/components/landing-v2/footer'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/legal/impressum', label: 'Impressum' },
  { href: '/legal/privacy', label: 'Datenschutz / Privacy' },
  { href: '/legal/terms', label: 'AGB / Terms' },
  { href: '/legal/cookies', label: 'Cookies' },
  { href: '/legal/subprocessors', label: 'Subprocessors' },
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
    <div className="min-h-dvh bg-background pt-16 text-foreground">
      <Navbar />

      {/* legal section nav */}
      <div className="border-b border-border">
        <nav className="mx-auto flex h-11 max-w-3xl items-center gap-1 overflow-x-auto px-4 text-xs">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'whitespace-nowrap rounded-md px-2 py-1 transition-colors',
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
      </main>

      <Footer />
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
