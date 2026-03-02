// =============================================================================
// CENTRAL NAVIGATION SCHEMA
// lib/navigation.ts
//
// Single source of truth for all navigation in Depo-Pro
// Role-based, function-first grouping
// Aligned with lib/permissions/route-access.ts
// =============================================================================

import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  FileText,
  Users,
  UserCircle,
  Settings,
  Shield,
  BarChart3,
  CreditCard,
  Building2,
  Mic,
  CheckCircle,
  Clock,
  FolderOpen,
  Upload,
  Webhook,
  FileAudio,
  Scale,
  MessageSquare,
  PlusCircle,
  type LucideIcon,
} from 'lucide-react';
import { PRE_BETA_MODE } from '@/lib/config/features';

// =============================================================================
// TYPES
// =============================================================================

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: string | number;
  description?: string;
}

export interface NavSection {
  section: string;
  icon?: LucideIcon;
  items: NavItem[];
  collapsed?: boolean;
}

export type NavigationSchema = NavSection[];

/**
 * Canonical application roles
 * Must align with types/database.ts UserRole
 */
export type UserRole =
  | 'ADMIN'
  | 'REPORTER'
  | 'SCOPIST'
  | 'ATTORNEY'
  | 'AGENCY';

// =============================================================================
// ADMIN NAVIGATION
// =============================================================================

const ADMIN_NAV: NavigationSchema = [
  {
    section: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      {
        id: 'admin-dashboard',
        label: 'Overview',
        href: '/admin',
        icon: LayoutDashboard,
        description: 'System overview and activity',
      },
    ],
  },
  {
    section: 'Cases & Jobs',
    icon: Briefcase,
    items: [
      { id: 'admin-jobs', label: 'All Jobs', href: '/jobs', icon: Briefcase },
      { id: 'admin-new-case', label: 'New Case', href: '/cases/new', icon: PlusCircle },
      { id: 'admin-new-job', label: 'New Job', href: '/jobs/new', icon: Upload },
      { id: 'admin-calendar', label: 'Calendar', href: '/calendar', icon: Calendar },
    ],
  },
  {
    section: 'Transcripts',
    icon: FileText,
    items: [
      { id: 'admin-transcripts-in-edit', label: 'In Progress', href: '/jobs?status=IN_EDIT', icon: Clock },
      { id: 'admin-transcripts-ready', label: 'Ready', href: '/jobs?status=READY_FOR_EDIT', icon: FileAudio },
      { id: 'admin-transcripts-completed', label: 'Completed', href: '/jobs?status=COMPLETED', icon: CheckCircle },
    ],
  },
  {
    section: 'People',
    icon: Users,
    items: [
      { id: 'admin-users', label: 'All Users', href: '/admin/users', icon: Users },
      { id: 'admin-users-reporters', label: 'Reporters', href: '/admin/users?role=REPORTER', icon: Mic },
      { id: 'admin-users-scopists', label: 'Scopists', href: '/admin/users?role=SCOPIST', icon: UserCircle },
      { id: 'admin-users-attorneys', label: 'Attorneys', href: '/admin/users?role=ATTORNEY', icon: Scale },
      { id: 'admin-users-agencies', label: 'Agencies', href: '/admin/users?role=AGENCY', icon: Building2 },
    ],
  },
  {
    section: 'Billing & Reports',
    icon: BarChart3,
    items: [
      { id: 'admin-billing', label: 'Billing', href: '/billing', icon: CreditCard },
      { id: 'admin-rx-queue', label: 'RX Queue', href: '/admin/rx-queue', icon: FileAudio },
      { id: 'admin-reports', label: 'Reports', href: '/reports', icon: BarChart3 },
    ],
  },
  {
    section: 'System',
    icon: Settings,
    items: [
      { id: 'admin-settings-profile', label: 'Profile', href: '/settings/profile', icon: Settings },
      { id: 'admin-settings-firm', label: 'Firm Settings', href: '/admin/firm', icon: Building2 },
      { id: 'admin-settings-security', label: 'Security', href: '/admin/security', icon: Shield },
      { id: 'admin-settings-integrations', label: 'Integrations', href: '/admin/integrations', icon: Webhook },
    ],
  },
];

// =============================================================================
// REPORTER NAVIGATION (CANONICAL)
// =============================================================================

const REPORTER_NAV: NavigationSchema = [
  {
    section: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { id: 'reporter-dashboard', label: 'My Dashboard', href: '/reporter', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Jobs',
    icon: Briefcase,
    items: [
      { id: 'reporter-jobs', label: 'My Jobs', href: '/jobs', icon: Briefcase },
      { id: 'reporter-new-case', label: 'New Case', href: '/cases/new', icon: PlusCircle },
      { id: 'reporter-new-job', label: 'New Job', href: '/jobs/new', icon: Upload },
    ],
  },
  {
    section: 'Schedule',
    icon: Calendar,
    items: [
      { id: 'reporter-calendar', label: 'Calendar', href: '/calendar', icon: Calendar },
      { id: 'reporter-availability', label: 'Availability', href: '/calendar/availability', icon: Clock },
    ],
  },
  {
    section: 'Transcripts',
    icon: FileText,
    items: [
      { id: 'reporter-ready', label: 'Ready', href: '/jobs?status=READY_FOR_EDIT', icon: FileAudio },
      { id: 'reporter-with-scopist', label: 'With Scopist', href: '/jobs?status=ASSIGNED', icon: UserCircle },
      { id: 'reporter-completed', label: 'Completed', href: '/jobs?status=COMPLETED', icon: CheckCircle },
    ],
  },
  {
    section: 'Settings',
    icon: Settings,
    items: [
      { id: 'reporter-settings', label: 'Profile', href: '/settings/profile', icon: Settings },
    ],
  },
];

// =============================================================================
// SCOPIST NAVIGATION
// =============================================================================

const SCOPIST_NAV: NavigationSchema = [
  {
    section: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { id: 'scopist-dashboard', label: 'My Dashboard', href: '/scopist', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Assignments',
    icon: Briefcase,
    items: [
      { id: 'scopist-assignments', label: 'My Assignments', href: '/jobs?assigned=me', icon: Briefcase },
      { id: 'scopist-available', label: 'Available Jobs', href: '/jobs?status=READY_FOR_EDIT', icon: FolderOpen },
    ],
  },
  {
    section: 'Work Queue',
    icon: FileText,
    items: [
      { id: 'scopist-in-progress', label: 'In Progress', href: '/jobs?status=IN_EDIT&assigned=me', icon: Clock },
      { id: 'scopist-submitted', label: 'Submitted', href: '/jobs?status=SUBMITTED_FOR_REVIEW&assigned=me', icon: CheckCircle },
    ],
  },
  {
    section: 'Settings',
    icon: Settings,
    items: [
      { id: 'scopist-settings', label: 'Profile', href: '/settings/profile', icon: Settings },
    ],
  },
];

// =============================================================================
// ATTORNEY NAVIGATION (CANONICAL)
// =============================================================================

const ATTORNEY_NAV: NavigationSchema = [
  {
    section: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      {
        id: 'attorney-dashboard',
        label: 'My Dashboard',
        href: '/attorney-dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    section: 'Cases',
    icon: Briefcase,
    items: [
      { id: 'attorney-cases', label: 'My Cases', href: '/attorney/cases', icon: Briefcase },
      { id: 'attorney-calendar', label: 'Calendar', href: '/calendar', icon: Calendar },
    ],
  },
  {
    section: 'Transcripts',
    icon: FileText,
    items: [
      { id: 'attorney-transcripts', label: 'Transcripts', href: '/attorney/transcripts', icon: FileText },
      { id: 'attorney-recent', label: 'Recent', href: '/attorney/transcripts?sort=recent', icon: Clock },
    ],
  },
  {
    section: 'Exhibits',
    icon: FolderOpen,
    items: [
      { id: 'attorney-exhibits', label: 'Exhibits', href: '/exhibits', icon: FolderOpen },
    ],
  },
  {
    section: 'Reports',
    icon: BarChart3,
    items: [
      { id: 'attorney-reports', label: 'Reports', href: '/reports', icon: BarChart3 },
      { id: 'attorney-issues', label: 'Issues', href: '/issues', icon: MessageSquare },
    ],
  },
  {
    section: 'Settings',
    icon: Settings,
    items: [
      { id: 'attorney-settings', label: 'Profile', href: '/settings/profile', icon: Settings },
    ],
  },
];

// =============================================================================
// AGENCY NAVIGATION
// =============================================================================

const AGENCY_NAV: NavigationSchema = [
  {
    section: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { id: 'agency-dashboard', label: 'Dashboard', href: '/agency', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Jobs',
    icon: Briefcase,
    items: [
      { id: 'agency-jobs', label: 'All Jobs', href: '/jobs', icon: Briefcase },
      { id: 'agency-new-case', label: 'New Case', href: '/cases/new', icon: PlusCircle },
    ],
  },
  {
    section: 'Schedule',
    icon: Calendar,
    items: [
      { id: 'agency-calendar', label: 'Calendar', href: '/calendar', icon: Calendar },
    ],
  },
  {
    section: 'Team',
    icon: Users,
    items: [
      { id: 'agency-reporters', label: 'Reporters', href: '/admin/users?role=REPORTER', icon: Mic },
      { id: 'agency-scopists', label: 'Scopists', href: '/admin/users?role=SCOPIST', icon: UserCircle },
    ],
  },
  {
    section: 'Billing',
    icon: CreditCard,
    items: [
      { id: 'agency-billing', label: 'Billing', href: '/billing', icon: CreditCard },
    ],
  },
];

// =============================================================================
// NAVIGATION REGISTRY
// =============================================================================

export const NAVIGATION: Record<UserRole, NavigationSchema> = {
  ADMIN: ADMIN_NAV,
  REPORTER: REPORTER_NAV,
  SCOPIST: SCOPIST_NAV,
  ATTORNEY: ATTORNEY_NAV,
  AGENCY: AGENCY_NAV,
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Nav item IDs hidden during pre-beta.
 * Routes remain accessible via direct URL.
 * To restore: remove ID from this set or set DISABLE_PRE_BETA=true.
 */
const PRE_BETA_HIDDEN_IDS = new Set([
  // Billing — fully stubbed (Stripe not wired)
  'admin-billing',
  'agency-billing',
  // Admin system pages — no page.tsx yet
  'admin-settings-firm',
  'admin-settings-security',
  'admin-settings-integrations',
  // Reports — placeholder stubs
  'admin-reports',
  'attorney-reports',
  // Attorney-specific pages — not built
  'attorney-cases',
  'attorney-transcripts',
  'attorney-recent',
  'attorney-exhibits',
  'attorney-issues',
]);

function applyPreBetaFilter(schema: NavigationSchema): NavigationSchema {
  return schema
    .map(section => ({
      ...section,
      items: section.items.filter(item => !PRE_BETA_HIDDEN_IDS.has(item.id)),
    }))
    .filter(section => section.items.length > 0);
}

export function getNavigationForRole(role: UserRole): NavigationSchema {
  const schema = NAVIGATION[role] ?? REPORTER_NAV;
  return PRE_BETA_MODE ? applyPreBetaFilter(schema) : schema;
}

export function getNavigationItemsForRole(role: UserRole): NavItem[] {
  return getNavigationForRole(role).flatMap(section => section.items);
}

export function isRouteInNavigation(role: UserRole, route: string): boolean {
  return getNavigationItemsForRole(role).some(
    item => route === item.href || route.startsWith(item.href + '/')
  );
}

export function findSectionForRoute(role: UserRole, route: string): NavSection | null {
  return (
    getNavigationForRole(role).find(section =>
      section.items.some(item => route === item.href || route.startsWith(item.href + '/'))
    ) ?? null
  );
}

export function getBreadcrumbs(
  role: UserRole,
  route: string
): Array<{ label: string; href: string }> {
  const section = findSectionForRoute(role, route);
  if (!section) return [];

  const item = section.items.find(
    i => route === i.href || route.startsWith(i.href + '/')
  );
  if (!item) return [];

  // Build breadcrumbs array
  const breadcrumbs: Array<{ label: string; href: string }> = [];

  // Add section breadcrumb (Dashboard, Jobs, etc.) only if different from item
  const sectionHref = section.items[0].href;
  if (sectionHref !== item.href) {
    breadcrumbs.push({ label: section.section, href: sectionHref });
  }

  // Add item breadcrumb
  breadcrumbs.push({ label: item.label, href: item.href });

  // Deduplicate by href (keep first occurrence)
  const seen = new Set<string>();
  return breadcrumbs.filter(b => {
    if (seen.has(b.href)) {
      return false;
    }
    seen.add(b.href);
    return true;
  });
}

// =============================================================================
// COMPATIBILITY EXPORTS
// =============================================================================

export function isPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const USER_MENU_ITEMS: NavItem[] = [
  { id: 'user-profile', label: 'Profile Settings', href: '/settings/profile' },
];

export const ADMIN_MENU_ITEMS: NavItem[] = [
  { id: 'admin-org', label: 'Organization Settings', href: '/admin/firm' },
  { id: 'admin-security', label: 'Security', href: '/admin/security' },
];

export const PUBLIC_NAV_ITEMS: NavItem[] = [
  { id: 'public-features', label: 'Features', href: '/features' },
  { id: 'public-pricing', label: 'Pricing', href: '/pricing' },
  { id: 'public-security', label: 'Security', href: '/security' },
  { id: 'public-about', label: 'About', href: '/about' },
  { id: 'public-contact', label: 'Contact', href: '/contact' },
];

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  REPORTER: 'Court Reporter',
  SCOPIST: 'Scopist',
  ATTORNEY: 'Attorney',
  AGENCY: 'Agency Admin',
};
