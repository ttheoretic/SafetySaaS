import { DocsSidebar } from '@/components/docs/docs-sidebar'
import { Navbar } from '@/components/landing-v2/navbar'

export const metadata = {
  title: 'Riscly Documentation',
  description:
    'Guides and API reference for Riscly — connect repositories, scan for risk, and ship one-click fixes.',
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background pt-16 text-foreground">
      <Navbar />
      <div className="flex">
        <DocsSidebar />
        <div className="min-w-0 flex-1">
          <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
