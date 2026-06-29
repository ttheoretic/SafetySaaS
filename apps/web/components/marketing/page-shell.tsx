import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

/** Lightweight frame for standalone marketing pages (About, Contact, Roadmap,
 *  Changelog, Blog, Careers): brand header, centered prose column, footer link. */
export function MarketingShell({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string
  title: string
  lead?: string
  children?: React.ReactNode
}) {
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
            <Link href="/docs" className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground">
              Docs
            </Link>
            <Link href="/pricing" className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link
              href="/get-started"
              className="rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-14">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {lead && <p className="mt-3 text-base leading-relaxed text-muted-foreground">{lead}</p>}
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </main>
    </div>
  )
}

export function MH2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-lg font-semibold text-foreground">{children}</h2>
}
