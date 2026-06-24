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
  Server,
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

type Child = { label: string; icon: LucideIcon; href: string; beta?: boolean }
type Group = { id: string; label: string; icon: LucideIcon; children: Child[] }

// First level = super-categories; clicking one drills into its pages. Every
// entry links to a real route (live or a structured placeholder), so the rail
// never leads nowhere.
const GROUPS: Group[] = [
  {
    id: 'home',
    label: 'Home',
    icon: LayoutGrid,
    children: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Portfolio', icon: LayoutGrid, href: '/portfolio' },
      { label: 'Trends', icon: TrendingUp, href: '/trends', beta: true },
    ],
  },
  {
    id: 'posture',
    label: 'Posture',
    icon: Network,
    children: [
      { label: 'Architecture', icon: Network, href: '/architecture' },
      { label: 'Simulation', icon: FlaskConical, href: '/simulation' },
      { label: 'Attack Paths', icon: Crosshair, href: '/attack-paths', beta: true },
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
      { label: 'Dependencies', icon: Boxes, href: '/dependencies' },
      { label: 'Secrets', icon: KeyRound, href: '/secrets' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    children: [
      { label: 'Services', icon: Server, href: '/inventory/services' },
      { label: 'Data Stores', icon: Database, href: '/inventory/data-stores' },
      { label: 'Dependencies / SBOM', icon: Boxes, href: '/inventory/sbom', beta: true },
      { label: 'Cloud Resources', icon: Cloud, href: '/inventory/cloud', beta: true },
    ],
  },
  {
    id: 'remediation',
    label: 'Remediation',
    icon: Wrench,
    children: [
      { label: 'Triage Queue', icon: ListChecks, href: '/remediation/triage', beta: true },
      { label: 'Fixes & PRs', icon: GitPullRequest, href: '/remediation/fixes', beta: true },
      { label: 'Policies', icon: ClipboardCheck, href: '/remediation/policies', beta: true },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: ClipboardCheck,
    children: [
      { label: 'Frameworks', icon: ClipboardCheck, href: '/compliance/frameworks', beta: true },
      { label: 'Reports & Export', icon: FileText, href: '/compliance/reports', beta: true },
      { label: 'Audit Log', icon: ScrollText, href: '/compliance/audit', beta: true },
    ],
  },
]

const UTILITIES: { label: string; icon: LucideIcon; href: string }[] = [
  { label: 'AI Assistant', icon: Bot, href: '/assistant' },
  { label: 'Settings', icon: Settings, href: '/settings' },
]

function useIsActive() {
  const pathname = usePathname()
  return (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar() {
  const isActive = useIsActive()

  const activeGroup =
    GROUPS.find((g) => g.children.some((c) => isActive(c.href))) ?? null
  const [openId, setOpenId] = useState<string | null>(activeGroup?.id ?? null)

  // Follow navigation into whichever section the current page belongs to.
  useEffect(() => {
    if (activeGroup) setOpenId(activeGroup.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup?.id])

  const open = GROUPS.find((g) => g.id === openId) ?? null

  return (
    // Collapsed rail reserves 56px; the panel overlays and expands on hover.
    <div className="group/sb relative w-14 shrink-0">
      <aside className="absolute inset-y-0 left-0 z-40 flex w-14 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out group-hover/sb:w-60 group-hover/sb:shadow-2xl group-hover/sb:shadow-black/40">
        {/* brand */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-3.5">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </div>
          <span className="whitespace-nowrap font-semibold tracking-tight opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
            Riscly
          </span>
        </div>

        {/* drill-in body */}
        <nav className="min-h-0 flex-1 overflow-y-auto p-2">
          {open ? (
            <CategoryView group={open} isActive={isActive} onBack={() => setOpenId(null)} />
          ) : (
            <RootView activeId={activeGroup?.id} onOpen={setOpenId} />
          )}
        </nav>

        {/* pinned utilities — always reachable, regardless of the open category */}
        <div className="shrink-0 border-t border-sidebar-border p-2">
          {UTILITIES.map((u) => (
            <RowLink key={u.href} href={u.href} icon={u.icon} label={u.label} active={isActive(u.href)} />
          ))}
        </div>
      </aside>
    </div>
  )
}

/** Level 1 — super-categories. Icons show collapsed; labels fade in on hover. */
function RootView({
  activeId,
  onOpen,
}: {
  activeId?: string
  onOpen: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {GROUPS.map((g) => {
        const Icon = g.icon
        return (
          <button
            key={g.id}
            onClick={() => onOpen(g.id)}
            title={g.label}
            className={cn(
              'group/item flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
              activeId === g.id
                ? 'bg-sidebar-accent/60 text-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1 whitespace-nowrap text-left opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
              {g.label}
            </span>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50 opacity-0 transition-all duration-150 group-hover/sb:opacity-100 group-hover/item:translate-x-0.5" />
          </button>
        )
      })}
    </div>
  )
}

/** Level 2 — the pages of one super-category, with a back link to level 1. */
function CategoryView({
  group,
  isActive,
  onBack,
}: {
  group: Group
  isActive: (href: string) => boolean
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={onBack}
        title="All sections"
        className="mb-1 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
      >
        <ChevronLeft className="size-3.5 shrink-0" />
        <span className="whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
          All sections
        </span>
      </button>

      <div className="whitespace-nowrap px-2.5 pb-1 pt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70 opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
        {group.label}
      </div>

      {group.children.map((c) => (
        <RowLink
          key={c.href}
          href={c.href}
          icon={c.icon}
          label={c.label}
          active={isActive(c.href)}
          beta={c.beta}
        />
      ))}
    </div>
  )
}

function RowLink({
  href,
  icon: Icon,
  label,
  active,
  beta,
}: {
  href: string
  icon: LucideIcon
  label: string
  active: boolean
  beta?: boolean
}) {
  return (
    <Link
      href={href}
      title={label}
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
      <Icon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
      <span className="flex-1 whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
        {label}
      </span>
      {beta && (
        <span className="whitespace-nowrap rounded-sm bg-muted px-1.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
          Soon
        </span>
      )}
    </Link>
  )
}
