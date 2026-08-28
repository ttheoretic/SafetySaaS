'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock } from 'lucide-react'
import { usePlan } from '@/lib/use-plan'
import { cn } from '@/lib/utils'

type Tab = { label: string; href: string }
type Section = { id: string; tabs: Tab[] }

/**
 * The second navigation level.
 *
 * The sidebar carries only the product's spine (Dashboard, Architecture, Risk
 * Center, AI Fixes, Simulations). Everything underneath a section lives here,
 * so depth is reachable without turning the sidebar into a directory: you go
 * to Architecture, and the graph, the changes and the inventories are tabs.
 *
 * Order matters — the first tab whose prefix matches the current path decides
 * which section is shown, and longer prefixes are checked first.
 */
const SECTIONS: Section[] = [
  {
    id: 'architecture',
    tabs: [
      { label: 'Graph', href: '/architecture' },
      { label: 'Changes', href: '/changes' },
      { label: 'Services', href: '/inventory/services' },
      { label: 'Data stores', href: '/inventory/data-stores' },
      { label: 'Cloud', href: '/inventory/cloud' },
      { label: 'SBOM', href: '/inventory/sbom' },
    ],
  },
  {
    id: 'risk',
    tabs: [
      { label: 'All risks', href: '/risks' },
      { label: 'Security', href: '/security' },
      { label: 'Dependencies', href: '/dependencies' },
      { label: 'Secrets', href: '/secrets' },
      { label: 'Attack paths', href: '/attack-paths' },
    ],
  },
  {
    id: 'fixes',
    tabs: [
      { label: 'Code fixes', href: '/code' },
      { label: 'Code quality', href: '/quality' },
    ],
  },
  {
    id: 'compliance',
    tabs: [
      { label: 'Reports & export', href: '/compliance/reports' },
      { label: 'Frameworks', href: '/compliance/frameworks' },
      { label: 'Audit log', href: '/compliance/audit' },
    ],
  },
]

const onPath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`)

/** The section the current route belongs to, if any. */
function sectionFor(pathname: string): Section | undefined {
  return SECTIONS.find((s) => s.tabs.some((t) => onPath(pathname, t.href)))
}

export function SectionTabs() {
  const pathname = usePathname()
  const { isPathLocked } = usePlan()
  const section = sectionFor(pathname)
  if (!section) return null

  return (
    <nav className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border bg-background px-3">
      {section.tabs.map((t) => {
        const active = onPath(pathname, t.href)
        const locked = isPathLocked(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            title={locked ? `${t.label} — upgrade to unlock` : t.label}
            className={cn(
              'relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-2 text-xs transition-colors',
              active
                ? 'font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground',
              locked && !active && 'text-muted-foreground/50',
            )}
          >
            {t.label}
            {locked && <Lock className="size-3" />}
            {/* underline marker in the same neutral gray as the sidebar pill */}
            <span
              className={cn(
                'absolute inset-x-1 -bottom-px h-0.5 rounded-full transition-colors',
                active ? 'bg-foreground/70' : 'bg-transparent',
              )}
            />
          </Link>
        )
      })}
    </nav>
  )
}
