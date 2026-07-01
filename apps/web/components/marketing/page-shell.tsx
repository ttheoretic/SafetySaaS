import { Navbar } from '@/components/landing-v2/navbar'
import { Footer } from '@/components/landing-v2/footer'

/** Lightweight frame for standalone marketing pages (About, Contact, Roadmap,
 *  Changelog, Blog, Careers): landing-v2 navbar, centered prose column, full
 *  footer. Rendered inside the landing-theme wrapper (see AppShell). */
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
    <div className="min-h-dvh bg-background pt-16 text-foreground">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-14">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {lead && <p className="mt-3 text-base leading-relaxed text-muted-foreground">{lead}</p>}
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </main>

      <Footer />
    </div>
  )
}

export function MH2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-lg font-semibold text-foreground">{children}</h2>
}
