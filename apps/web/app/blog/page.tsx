import { MarketingShell } from '@/components/marketing/page-shell'

export const metadata = { title: 'Blog — Riscly' }

export default function BlogPage() {
  return (
    <MarketingShell
      eyebrow="Resources"
      title="Blog"
      lead="Notes on architecture, security and reliability — and how we’re building Riscly."
    >
      <div className="rounded-xl border border-dashed border-border bg-panel p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No posts yet. We’re writing the first ones now — about mapping real
          systems, finding risk that hides between components, and shipping fixes
          safely.
        </p>
        <a
          href="mailto:hello@riscly.app?subject=Notify%20me%20about%20the%20Riscly%20blog"
          className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Get notified
        </a>
      </div>
    </MarketingShell>
  )
}
