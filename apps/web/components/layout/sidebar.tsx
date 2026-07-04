'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
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
  ClipboardCheck,
  FileText,
  ScrollText,
  Bot,
  Settings,
  Lock,
  Activity,
  Search,
  ChevronDown,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlan } from '@/lib/use-plan'
import { useActiveProject, useLatestScan } from '@/lib/use-project-data'
import { RisclyMark } from '@/components/brand/logo'

type Child = { label: string; icon: LucideIcon; href: string; beta?: boolean }
type Group = { id: string; label: string; children: Child[] }

// Fixed section headers with all children always visible — no drilling, no
// collapsing. Every entry links to a real route.
const GROUPS: Group[] = [
  {
    id: 'home',
    label: 'Home',
    children: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Trends', icon: TrendingUp, href: '/trends' },
    ],
  },
  {
    id: 'posture',
    label: 'Posture',
    children: [
      { label: 'Architecture', icon: Network, href: '/architecture' },
      { label: 'Simulation', icon: FlaskConical, href: '/simulation' },
      { label: 'Attack Paths', icon: Crosshair, href: '/attack-paths' },
    ],
  },
  {
    id: 'findings',
    label: 'Findings',
    children: [
      { label: 'All Findings', icon: ShieldAlert, href: '/risks' },
      { label: 'Security', icon: LockKeyhole, href: '/security' },
      { label: 'Code (SAST)', icon: CodeXml, href: '/code' },
      { label: 'Code Quality', icon: Activity, href: '/quality' },
      { label: 'Dependencies', icon: Boxes, href: '/dependencies' },
      { label: 'Secrets', icon: KeyRound, href: '/secrets' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    children: [
      { label: 'Services', icon: Server, href: '/inventory/services' },
      { label: 'Data Stores', icon: Database, href: '/inventory/data-stores' },
      { label: 'Dependencies / SBOM', icon: Boxes, href: '/inventory/sbom' },
      { label: 'Cloud Resources', icon: Cloud, href: '/inventory/cloud' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    children: [
      { label: 'Frameworks', icon: ClipboardCheck, href: '/compliance/frameworks' },
      { label: 'Reports & Export', icon: FileText, href: '/compliance/reports' },
      { label: 'Audit Log', icon: ScrollText, href: '/compliance/audit' },
    ],
  },
]

const UTILITIES: { label: string; icon: LucideIcon; href: string }[] = [
  { label: 'AI Assistant', icon: Bot, href: '/assistant' },
  { label: 'Help & Support', icon: HelpCircle, href: '/docs/faq' },
  { label: 'Settings', icon: Settings, href: '/settings' },
]

/**
 * Always-expanded sidebar in the landing-console style: brand + workspace
 * switcher on top, a ⌘K search field, grouped nav with a live findings badge,
 * and pinned utilities (help, settings) at the bottom.
 */
export function Sidebar() {
  const pathname = usePathname()
  const { isPathLocked } = usePlan()
  const { projectId } = useActiveProject()
  const scan = useLatestScan(projectId)
  const openFindings = scan.data?.findings?.length ?? 0

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <aside className="flex w-60 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar">
      {/* brand + workspace switcher */}
      <div className="shrink-0 border-b border-sidebar-border p-2.5">
        <Link
          href="/portfolio"
          title="Switch repository"
          className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-sidebar-accent/60"
        >
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <RisclyMark className="size-4" />
          </div>
          <span className="font-semibold tracking-tight">Riscly</span>
          <ChevronDown className="ml-auto size-3.5 text-muted-foreground" />
        </Link>
      </div>

      {/* search — focuses the global search in the top bar */}
      <div className="shrink-0 p-2.5 pb-1">
        <button
          onClick={() => {
            const el = document.getElementById('global-search') as HTMLInputElement | null
            el?.focus()
          }}
          className="flex w-full items-center gap-2 rounded-md bg-sidebar-accent/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent"
        >
          <Search className="size-3.5" />
          <span>Search risks…</span>
          <kbd className="ml-auto rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
        </button>
      </div>

      {/* grouped nav */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-1.5">
        {GROUPS.map((g, gi) => (
          <div key={g.id} className={cn('flex flex-col gap-0.5', gi > 0 && 'mt-4')}>
            <div className="px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {g.label}
            </div>
            {g.children.map((c) => (
              <RowLink
                key={c.href}
                child={c}
                active={isActive(c.href)}
                locked={isPathLocked(c.href)}
                badge={c.href === '/risks' && openFindings > 0 ? openFindings : undefined}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* pinned utilities — always reachable */}
      <div className="shrink-0 border-t border-sidebar-border p-2.5">
        {UTILITIES.map((u) => (
          <RowLink
            key={u.href}
            child={{ label: u.label, icon: u.icon, href: u.href }}
            active={isActive(u.href)}
          />
        ))}
      </div>
    </aside>
  )
}

function RowLink({
  child,
  active,
  locked = false,
  badge,
}: {
  child: Child
  active: boolean
  locked?: boolean
  badge?: number
}) {
  const Icon = child.icon
  return (
    <Link
      href={child.href}
      title={locked ? `${child.label} — upgrade to unlock` : child.label}
      className={cn(
        // The active item is a solid blue pill (landing-console / Datadog style).
        'relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
        active
          ? 'bg-primary font-medium text-primary-foreground'
          : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
        locked && !active && 'text-muted-foreground/50',
      )}
    >
      <Icon className={cn('size-4 shrink-0', active ? 'text-primary-foreground' : 'text-muted-foreground')} />
      <span className="flex-1 truncate">{child.label}</span>
      {typeof badge === 'number' && (
        <span
          className={cn(
            'flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-medium',
            active ? 'bg-white/20 text-primary-foreground' : 'bg-primary/80 text-primary-foreground',
          )}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {locked ? (
        <Lock className="size-3 shrink-0 text-muted-foreground/50" />
      ) : child.beta ? (
        <span className="rounded-sm bg-muted px-1.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
          Soon
        </span>
      ) : null}
    </Link>
  )
}
