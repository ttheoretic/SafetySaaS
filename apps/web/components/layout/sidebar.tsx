'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Child = { label: string; icon: LucideIcon; href: string; beta?: boolean }
type Group = { id: string; label: string; children: Child[] }

// Pattern D: fixed section headers with all children always visible — no
// drilling, no collapsing. Every entry links to a real route.
const GROUPS: Group[] = [
  {
    id: 'home',
    label: 'Home',
    children: [
      { label: 'Repositories', icon: LayoutGrid, href: '/portfolio' },
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Trends', icon: TrendingUp, href: '/trends', beta: true },
    ],
  },
  {
    id: 'posture',
    label: 'Posture',
    children: [
      { label: 'Architecture', icon: Network, href: '/architecture' },
      { label: 'Simulation', icon: FlaskConical, href: '/simulation' },
      { label: 'Attack Paths', icon: Crosshair, href: '/attack-paths', beta: true },
    ],
  },
  {
    id: 'findings',
    label: 'Findings',
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
    children: [
      { label: 'Triage Queue', icon: ListChecks, href: '/remediation/triage', beta: true },
      { label: 'Fixes & PRs', icon: GitPullRequest, href: '/remediation/fixes', beta: true },
      { label: 'Policies', icon: ClipboardCheck, href: '/remediation/policies', beta: true },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
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

export function Sidebar() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === href || pathname.startsWith(`${href}/`)

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

        {/* all sections, all children — Pattern D */}
        <nav className="min-h-0 flex-1 overflow-y-auto p-2">
          {GROUPS.map((g, gi) => (
            <div
              key={g.id}
              className={cn(
                'flex flex-col gap-0.5',
                gi > 0 && 'mt-1 border-t border-sidebar-border/60 pt-1',
              )}
            >
              <div className="h-4 whitespace-nowrap px-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
                {g.label}
              </div>
              {g.children.map((c) => (
                <RowLink key={c.href} child={c} active={isActive(c.href)} />
              ))}
            </div>
          ))}
        </nav>

        {/* pinned utilities — always reachable */}
        <div className="shrink-0 border-t border-sidebar-border p-2">
          {UTILITIES.map((u) => (
            <RowLink
              key={u.href}
              child={{ label: u.label, icon: u.icon, href: u.href }}
              active={isActive(u.href)}
            />
          ))}
        </div>
      </aside>
    </div>
  )
}

function RowLink({ child, active }: { child: Child; active: boolean }) {
  const Icon = child.icon
  return (
    <Link
      href={child.href}
      title={child.label}
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
        {child.label}
      </span>
      {child.beta && (
        <span className="whitespace-nowrap rounded-sm bg-muted px-1.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100">
          Soon
        </span>
      )}
    </Link>
  )
}
