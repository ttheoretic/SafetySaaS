import {
  LayoutDashboard, Network, Crosshair, ShieldAlert, FlaskConical,
  Sparkles, Users, Settings, type LucideIcon,
} from 'lucide-react';

export interface NavSection {
  label: string;
  icon: LucideIcon;
  href: string;
}

/**
 * The app's information architecture: a flat list of top-level sections.
 * No sub-tabs — every destination is reachable directly from the sidebar.
 */
export const SECTIONS: NavSection[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Architecture', icon: Network, href: '/architecture' },
  { label: 'Risk Center', icon: Crosshair, href: '/risk-center' },
  { label: 'Security', icon: ShieldAlert, href: '/security' },
  { label: 'Simulations', icon: FlaskConical, href: '/simulations' },
  { label: 'AI Predictions', icon: Sparkles, href: '/predictions' },
  { label: 'Team', icon: Users, href: '/team' },
  { label: 'Settings', icon: Settings, href: '/settings' },
];
