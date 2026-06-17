import {
  LayoutDashboard, Network, Crosshair, FlaskConical, TrendingDown,
  Sparkles, FileText, Users, Settings, type LucideIcon,
} from 'lucide-react';

export interface NavTab {
  label: string;
  href: string;
}

export interface NavSection {
  label: string;
  icon: LucideIcon;
  /** Where the section icon links to (its first/overview page). */
  href: string;
  /** Sub-views shown as tabs within the section (and on sidebar hover). */
  tabs: NavTab[];
}

/**
 * The app's information architecture: eight top-level sections. Sub-views are
 * tabs over the same data, not separate destinations, so the nav stays small.
 */
export const SECTIONS: NavSection[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', tabs: [] },
  { label: 'Architecture', icon: Network, href: '/architecture', tabs: [] },
  {
    label: 'Risk Center', icon: Crosshair, href: '/risk-center',
    tabs: [
      { label: 'Overview', href: '/risk-center' },
      { label: 'Reliability', href: '/reliability' },
      { label: 'Security', href: '/security' },
    ],
  },
  {
    label: 'Scenario Lab', icon: FlaskConical, href: '/simulations',
    tabs: [
      { label: 'Simulations', href: '/simulations' },
      { label: 'Custom Scenarios', href: '/scenarios' },
    ],
  },
  {
    label: 'Business Impact', icon: TrendingDown, href: '/revenue',
    tabs: [
      { label: 'Revenue', href: '/revenue' },
      { label: 'Downtime', href: '/downtime' },
      { label: 'SLA Impact', href: '/sla' },
      { label: 'Churn Risk', href: '/churn' },
    ],
  },
  { label: 'AI Predictions', icon: Sparkles, href: '/predictions', tabs: [] },
  { label: 'Reports', icon: FileText, href: '/reports', tabs: [] },
  { label: 'Team', icon: Users, href: '/team', tabs: [] },
  { label: 'Settings', icon: Settings, href: '/settings', tabs: [] },
];

/** All routes that belong to a section (its own href + tab hrefs). */
function sectionRoutes(s: NavSection): string[] {
  return [s.href, ...s.tabs.map((t) => t.href)];
}

/** The section that owns a given pathname, if any. */
export function sectionForPath(pathname: string): NavSection | undefined {
  return (
    SECTIONS.find((s) => sectionRoutes(s).some((r) => pathname === r)) ??
    SECTIONS.find((s) => sectionRoutes(s).some((r) => pathname.startsWith(r + '/')))
  );
}
