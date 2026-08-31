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
 * The sidebar carries the lifecycle; this carries the depth underneath each
 * step, so the rail never becomes a directory. Go to Architecture and the
 * graph, the inventories and the attack paths are tabs of the same place.
 *
 * Order matters — the first tab whose prefix matches the current path decides
 * which section is shown, and longer prefixes are checked first.
 */
const SECTIONS: Section[] = [
  {
    id: 'architecture',
    tabs: [
      { label: 'Graph', href: '/architecture' },
      { label: 'Services', href: '/inventory/services' },
      { label: 'Data stores', href: '/inventory/data-stores' },
      { label: 'Cloud', href: '/inventory/cloud' },
      { label: 'Attack paths', href: '/attack-paths' },
      { label: 'SBOM', href: '/inventory/sbom' },
    ],
  },
  {
    // Risk categories are dimensions *inside* the Risk Center; these tabs are
    // the views that genuinely do more than filter — grouped vulnerabilities,
    // advisory detail, live secret verification.
    id: 'risk',
    tabs: [
      { label: 'All risks', href: '/risks' },
      { label: 'Security posture', href: '/security' },
      { label: 'Dependencies', href: '/dependencies' },
      { label: 'Secrets', href: '/secrets' },
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
    id: 'reports',
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
