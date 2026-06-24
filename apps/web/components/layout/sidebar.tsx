'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  LayoutGrid,
  TrendingUp,
  Network,
  FlaskConical,
  Crosshair,
  ShieldAlert,
  LockKeyhole,
  CodeXml,
  Boxes,
  KeyRound,
  Cloud,
  Database,
  Wrench,
  GitPullRequest,
  ListChecks,
  ClipboardCheck,
  FileText,
  ScrollText,
  Bot,
  Settings,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/** A destination. `href` present = live page; `soon` = planned, shown disabled. */
type Child = {
  label: string
  icon: LucideIcon
  href?: string
  soon?: boolean
}

/** A super-category — the first level. Clicking it drills into its children. */
type Group = {
  id: string
  label: string
  icon: LucideIcon
  soon?: boolean
  children: Child[]
}

// First level = super-categories; second level = their pages. Only entries with
// an href are live today; `soon` entries telegraph the roadmap without 404ing.
const GROUPS: Group[] = [
  {
    id: 'home',
    label: 'Home',
    icon: LayoutGrid,
    children: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Portfolio', icon: LayoutGrid, soon: true },
      { label: 'Trends', icon: TrendingUp, soon: true },
    ],
  },
  {
    id: 'posture',
    label: 'Posture',
    icon: Network,
    children: [
      { label: 'Architecture', icon: Network, href: '/architecture' },
      { label: 'Simulation', icon: FlaskConical, href: '/simulation' },
      { label: 'Attack Paths', icon: Crosshair, soon: true },
    ],
  },
  {
    id: 'findings',
    label: 'Findings',
    icon: ShieldAlert,
    children: [
      { label: 'All Findings', icon: ShieldAlert, href: '/risks' },
      { label: 'Security', icon: LockKeyhole, href: '/security' },
      { label: 'Code (SAST)', icon: CodeXml, href: '/code' },
      { label: 'Dependencies', icon: Boxes, soon: true },
      { label: 'Secrets', icon: KeyRound, soon: true },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    soon: true,
    children: [
      { label: 'Services', icon: Network, soon: true },
      { label: 'Dependencies / SBOM', icon: Boxes, soon: true },
      { label: 'Data Stores', icon: Database, soon: true },
      { label: 'Cloud Resources', icon: Cloud, soon: true },
    ],
  },
  {
    id: 'remediation',
    label: 'Remediation',
    icon: Wrench,
    soon: true,
    children: [
      { label: 'Triage Queue', icon: ListChecks, soon: true },
      { label: 'Fixes & PRs', icon: GitPullRequest, soon: true },
      { label: 'Policies', icon: ClipboardCheck, soon: true },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: ClipboardCheck,
    soon: true,
    children: [
      { label: 'Frameworks', icon: ClipboardCheck, soon: true },
      { label: 'Reports & Export', icon: FileText, soon: true },
      { label: 'Audit Log', icon: ScrollText, soon: true },
    ],
  },
]

// Always-available utilities — never inside a category, pinned at the bottom.
const UTILITIES: { label: string; icon: LucideIcon; href: string }[] = [
  { label: 'AI Assistant', icon: Bot, href: '/assistant' },
  { label: 'Settings', icon: Settings, href: '/settings' },
]

function useIsActive() {
  const pathname = usePathname()
  return (href?: string) => {
    if (!href) return false
    return href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === href || pathname.startsWith(`${href}/`)
  }
}

export function Sidebar() {
  const pathname = usePathname()
  const isActive = useIsActive()

  // The category that contains the current page (so the right level opens).
  const activeGroup =
    GROUPS.find((g) => g.children.some((c) => isActive(c.href))) ?? null

  // Drill-in state: which super-category is open (null = top level).
  const [openId, setOpenId] = useState<string | null>(activeGroup?.id ?? null)

  // When navigation lands in a different section, follow it into that category.
  useEffect(() => {
    if (activeGroup) setOpenId(activeGroup.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup?.id])

  const open = GROUPS.find((g) => g.id === openId) ?? null

  return (
    <div className="w-60 shrink-0">
      <aside className="flex h-full w-60 flex-col border-r border-sidebar-border bg-sidebar">
        {/* brand */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-3.5">
          <div className="flex size-6 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </div>
          <span className="font-semibold tracking-tight">Riscly</span>
        </div>

        {/* drill-in body */}
        <nav className="min-h-0 flex-1 overflow-y-auto p-2">
          {open ? (
            <CategoryView
              group={open}
              isActive={isActive}
              onBack={() => setOpenId(null)}
            />
          ) : (
            <RootView groups={GROUPS} activeId={activeGroup?.id} onOpen={setOpenId} />
          )}
        </nav>

        {/* pinned utilities — always reachable, independent of the category */}
        <div className="shrink-0 border-t border-sidebar-border p-2">
          {UTILITIES.map((u) => {
            const Icon = u.icon
            const active = isActive(u.href)
            return (
              <Link
                key={u.href}
                href={u.href}
                className={cn(
                  'relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-sidebar-accent text-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon
                  className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')}
                />
                {u.label}
              </Link>
            )
          })}
        </div>
      </aside>
    </div>
  )
}

/** Level 1 — the list of super-categories. */
function RootView({
  groups,
  activeId,
  onOpen,
}: {
  groups: Group[]
  activeId?: string
  onOpen: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {groups.map((g) => {
        const Icon = g.icon
        return (
          <button
            key={g.id}
            onClick={() => onOpen(g.id)}
            className={cn(
              'group/item flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
              activeId === g.id
                ? 'bg-sidebar-accent/60 text-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1 text-left">{g.label}</span>
            {g.soon && (
              <span className="rounded-sm bg-muted px-1.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                Soon
              </span>
            )}
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover/item:translate-x-0.5" />
          </button>
        )
      })}
    </div>
  )
}

/** Level 2 — the children of one super-category, with a back link to level 1. */
function CategoryView({
  group,
  isActive,
  onBack,
}: {
  group: Group
  isActive: (href?: string) => boolean
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={onBack}
        className="mb-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        All sections
      </button>

      <div className="px-2.5 pb-1 pt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {group.label}
      </div>

      {group.children.map((c) => {
        const Icon = c.icon
        const active = isActive(c.href)

        if (!c.href) {
          // Planned destination — visible but disabled so the structure shows
          // without leading anywhere dead.
          return (
            <div
              key={c.label}
              className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground/40"
              title="Coming with deeper scanning"
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{c.label}</span>
              <span className="rounded-sm bg-muted px-1.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground/60">
                Soon
              </span>
            </div>
          )
        }

        return (
          <Link
            key={c.href}
            href={c.href}
            className={cn(
              'relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
              active
                ? 'bg-sidebar-accent text-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
            )}
            <Icon
              className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')}
            />
            <span className="flex-1">{c.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
