// ═══════════════════════════════════════════════════════════════════════════════
// CENTRAL NAVIGATION SCHEMA
// lib/navigation.ts
//
// Single source of truth for all navigation in Depo-Pro
// Role-based, function-first grouping, easy to audit and extend
// ═══════════════════════════════════════════════════════════════════════════════

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
  Activity,
  FileAudio,
  Scale,
  MessageSquare,
  PlusCircle,
  ListTodo,
  type LucideIcon,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface NavItem {
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

export type UserRole = 'ADMIN' | 'REPORTER' | 'SCOPIST' | 'ATTORNEY' | 'AGENCY';

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION SCHEMAS BY ROLE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ADMIN Navigation
 * Full access to all system functions
 * Organized by function, not by route
 */
const ADMIN_NAV: NavigationSchema = [
  {
    section: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { label: 'Overview', href: '/admin', icon: LayoutDashboard, description: 'System overview and stats' },
      { label: 'Activity Feed', href: '/admin/activity', icon: Activity, description: 'Recent system activity' },
    ],
  },
  {
    section: 'Cases & Jobs',
    icon: Briefcase,
    items: [
      { label: 'All Jobs', href: '/jobs', icon: Briefcase, description: 'View and manage all jobs' },
      { label: 'New Case (AI Intake)', href: '/cases/new', icon: PlusCircle, description: 'Upload NOD, CSR paperwork, audio' },
      { label: 'New Job (Manual)', href: '/jobs/new', icon: Upload, description: 'Create job manually' },
      { label: 'Calendar', href: '/calendar', icon: Calendar, description: 'Deposition schedule' },
      { label: 'Booking Requests', href: '/calendar/requests', icon: ListTodo, description: 'Pending scheduling requests' },
    ],
  },
  {
    section: 'Transcripts',
    icon: FileText,
    items: [
      { label: 'In Progress', href: '/jobs?status=IN_EDIT', icon: Clock, description: 'Currently being edited' },
      { label: 'Ready for Review', href: '/jobs?status=READY_FOR_EDIT', icon: FileAudio, description: 'AI processing complete' },
      { label: 'Completed', href: '/jobs?status=COMPLETED', icon: CheckCircle, description: 'Finalized transcripts' },
    ],
  },
  {
    section: 'People',
    icon: Users,
    items: [
      { label: 'All Users', href: '/admin/users', icon: Users, description: 'Manage all users' },
      { label: 'Court Reporters', href: '/admin/users?role=REPORTER', icon: Mic, description: 'Reporter accounts' },
      { label: 'Scopists', href: '/admin/users?role=SCOPIST', icon: UserCircle, description: 'Scopist accounts' },
      { label: 'Attorneys', href: '/admin/users?role=ATTORNEY', icon: Scale, description: 'Attorney accounts' },
      { label: 'Agencies', href: '/admin/users?role=AGENCY', icon: Building2, description: 'Agency accounts' },
    ],
  },
  {
    section: 'Billing',
    icon: CreditCard,
    items: [
      { label: 'Overview', href: '/billing', icon: CreditCard, description: 'Billing dashboard' },
      { label: 'RX Queue', href: '/admin/rx-queue', icon: FileAudio, description: 'Manual audio enhancement queue' },
    ],
  },
  {
    section: 'Reports',
    icon: BarChart3,
    items: [
      { label: 'Usage Reports', href: '/admin/reports/usage', icon: BarChart3, description: 'Platform usage stats' },
      { label: 'Billing Reports', href: '/admin/reports/billing', icon: CreditCard, description: 'Revenue and billing' },
      { label: 'Accuracy Metrics', href: '/admin/reports/accuracy', icon: CheckCircle, description: 'AI transcription accuracy' },
    ],
  },
  {
    section: 'System',
    icon: Settings,
    items: [
      { label: 'Settings', href: '/settings/profile', icon: Settings, description: 'Profile settings' },
      { label: 'Firm Settings', href: '/admin/firm', icon: Building2, description: 'Firm configuration' },
      { label: 'Security', href: '/admin/security', icon: Shield, description: 'Security settings' },
      { label: 'Integrations', href: '/admin/integrations', icon: Webhook, description: 'Third-party integrations' },
    ],
  },
];

/**
 * REPORTER Navigation
 * Court reporters who create jobs and manage their transcripts
 */
const REPORTER_NAV: NavigationSchema = [
  {
    section: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { label: 'My Dashboard', href: '/reporter', icon: LayoutDashboard, description: 'Your overview' },
    ],
  },
  {
    section: 'Jobs',
    icon: Briefcase,
    items: [
      { label: 'My Jobs', href: '/jobs', icon: Briefcase, description: 'Your transcription jobs' },
      { label: 'New Case (AI Intake)', href: '/cases/new', icon: PlusCircle, description: 'Upload NOD, CSR paperwork, audio' },
      { label: 'New Job (Manual)', href: '/jobs/new', icon: Upload, description: 'Create job manually' },
    ],
  },
  {
    section: 'Schedule',
    icon: Calendar,
    items: [
      { label: 'Calendar', href: '/calendar', icon: Calendar, description: 'Deposition schedule' },
      { label: 'My Availability', href: '/calendar/availability', icon: Clock, description: 'Set your availability' },
    ],
  },
  {
    section: 'Transcripts',
    icon: FileText,
    items: [
      { label: 'Ready for Review', href: '/jobs?status=READY_FOR_EDIT', icon: FileAudio, description: 'AI processing complete' },
      { label: 'With Scopist', href: '/jobs?status=ASSIGNED', icon: UserCircle, description: 'Assigned to scopist' },
      { label: 'Completed', href: '/jobs?status=COMPLETED', icon: CheckCircle, description: 'Finalized transcripts' },
    ],
  },
  {
    section: 'Settings',
    icon: Settings,
    items: [
      { label: 'Profile', href: '/settings/profile', icon: Settings, description: 'Your profile settings' },
    ],
  },
];

/**
 * SCOPIST Navigation
 * Scopists who edit and proofread transcripts
 */
const SCOPIST_NAV: NavigationSchema = [
  {
    section: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { label: 'My Dashboard', href: '/scopist', icon: LayoutDashboard, description: 'Your overview' },
    ],
  },
  {
    section: 'Assignments',
    icon: Briefcase,
    items: [
      { label: 'My Assignments', href: '/jobs?assigned=me', icon: Briefcase, description: 'Jobs assigned to you' },
      { label: 'Available Jobs', href: '/jobs?status=READY_FOR_EDIT', icon: FolderOpen, description: 'Jobs available to claim' },
    ],
  },
  {
    section: 'Work Queue',
    icon: FileText,
    items: [
      { label: 'In Progress', href: '/jobs?status=IN_EDIT&assigned=me', icon: Clock, description: 'Currently editing' },
      { label: 'Submitted', href: '/jobs?status=SUBMITTED_FOR_REVIEW&assigned=me', icon: CheckCircle, description: 'Awaiting review' },
    ],
  },
  {
    section: 'Settings',
    icon: Settings,
    items: [
      { label: 'Profile', href: '/settings/profile', icon: Settings, description: 'Your profile settings' },
    ],
  },
];

/**
 * ATTORNEY Navigation
 * Attorneys who view transcripts and manage their cases
 */
const ATTORNEY_NAV: NavigationSchema = [
  {
    section: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { label: 'My Dashboard', href: '/attorney', icon: LayoutDashboard, description: 'Your overview' },
    ],
  },
  {
    section: 'Cases',
    icon: Briefcase,
    items: [
      { label: 'My Cases', href: '/attorney/cases', icon: Briefcase, description: 'Cases you are involved in' },
      { label: 'Calendar', href: '/calendar', icon: Calendar, description: 'Upcoming depositions' },
    ],
  },
  {
    section: 'Transcripts',
    icon: FileText,
    items: [
      { label: 'All Transcripts', href: '/attorney/transcripts', icon: FileText, description: 'View your transcripts' },
      { label: 'Recent', href: '/attorney/transcripts?sort=recent', icon: Clock, description: 'Recently updated' },
    ],
  },
  {
    section: 'Exhibits',
    icon: FolderOpen,
    items: [
      { label: 'All Exhibits', href: '/attorney/exhibits', icon: FolderOpen, description: 'Case exhibits' },
    ],
  },
  {
    section: 'Reports',
    icon: BarChart3,
    items: [
      { label: 'Case Reports', href: '/attorney/reports', icon: BarChart3, description: 'Generate reports' },
      { label: 'Issues', href: '/attorney/issues', icon: MessageSquare, description: 'Transcript issues' },
    ],
  },
  {
    section: 'Settings',
    icon: Settings,
    items: [
      { label: 'Profile', href: '/settings/profile', icon: Settings, description: 'Your profile settings' },
    ],
  },
];

/**
 * AGENCY Navigation
 * Agencies who manage reporters and scheduling
 */
const AGENCY_NAV: NavigationSchema = [
  {
    section: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { label: 'Agency Dashboard', href: '/admin', icon: LayoutDashboard, description: 'Agency overview' },
    ],
  },
  {
    section: 'Jobs',
    icon: Briefcase,
    items: [
      { label: 'All Jobs', href: '/jobs', icon: Briefcase, description: 'All agency jobs' },
      { label: 'New Case (AI Intake)', href: '/cases/new', icon: PlusCircle, description: 'Upload NOD, CSR paperwork, audio' },
      { label: 'New Job (Manual)', href: '/jobs/new', icon: Upload, description: 'Create job manually' },
    ],
  },
  {
    section: 'Schedule',
    icon: Calendar,
    items: [
      { label: 'Calendar', href: '/calendar', icon: Calendar, description: 'Deposition schedule' },
      { label: 'Booking Requests', href: '/calendar/requests', icon: ListTodo, description: 'Pending requests' },
      { label: 'New Booking', href: '/calendar/requests/new', icon: PlusCircle, description: 'Create booking request' },
    ],
  },
  {
    section: 'Team',
    icon: Users,
    items: [
      { label: 'Reporters', href: '/admin/users?role=REPORTER', icon: Mic, description: 'Court reporters' },
      { label: 'Scopists', href: '/admin/users?role=SCOPIST', icon: UserCircle, description: 'Scopists' },
    ],
  },
  {
    section: 'Billing',
    icon: CreditCard,
    items: [
      { label: 'Overview', href: '/billing', icon: CreditCard, description: 'Billing dashboard' },
      { label: 'RX Queue', href: '/admin/rx-queue', icon: FileAudio, description: 'Audio enhancement queue' },
    ],
  },
  {
    section: 'Settings',
    icon: Settings,
    items: [
      { label: 'Profile', href: '/settings/profile', icon: Settings, description: 'Profile settings' },
      { label: 'Agency Settings', href: '/admin/firm', icon: Building2, description: 'Agency configuration' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION LOOKUP
// ═══════════════════════════════════════════════════════════════════════════════

export const NAVIGATION: Record<UserRole, NavigationSchema> = {
  ADMIN: ADMIN_NAV,
  REPORTER: REPORTER_NAV,
  SCOPIST: SCOPIST_NAV,
  ATTORNEY: ATTORNEY_NAV,
  AGENCY: AGENCY_NAV,
};

/**
 * Get navigation for a specific role
 */
export function getNavigationForRole(role: UserRole): NavigationSchema {
  return NAVIGATION[role] || REPORTER_NAV; // Default to reporter if unknown
}

/**
 * Get flat list of navigation items for a role (compatibility function)
 * Flattens the section-based navigation into a simple array
 */
export function getNavigationItemsForRole(role: UserRole): NavItem[] {
  const schema = getNavigationForRole(role);
  return schema.flatMap((section) => section.items);
}

/**
 * Get all unique routes from navigation (useful for sitemap, testing)
 */
export function getAllRoutes(): string[] {
  const routes = new Set<string>();
  
  Object.values(NAVIGATION).forEach((schema) => {
    schema.forEach((section) => {
      section.items.forEach((item) => {
        routes.add(item.href);
      });
    });
  });
  
  return Array.from(routes).sort();
}

/**
 * Check if a route is in a role's navigation
 */
export function isRouteInNavigation(role: UserRole, route: string): boolean {
  const nav = NAVIGATION[role];
  return nav.some((section) =>
    section.items.some((item) => item.href === route || route.startsWith(item.href + '/'))
  );
}

/**
 * Find the section containing a specific route
 */
export function findSectionForRoute(role: UserRole, route: string): NavSection | null {
  const nav = NAVIGATION[role];
  return nav.find((section) =>
    section.items.some((item) => item.href === route || route.startsWith(item.href + '/'))
  ) || null;
}

/**
 * Generate breadcrumbs for a route
 */
export function getBreadcrumbs(role: UserRole, route: string): Array<{ label: string; href: string }> {
  const nav = NAVIGATION[role];
  const breadcrumbs: Array<{ label: string; href: string }> = [];
  
  for (const section of nav) {
    for (const item of section.items) {
      if (item.href === route || route.startsWith(item.href + '/')) {
        breadcrumbs.push({ label: section.section, href: section.items[0]?.href || '#' });
        breadcrumbs.push({ label: item.label, href: item.href });
        return breadcrumbs;
      }
    }
  }
  
  return breadcrumbs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPATIBILITY EXPORTS (for legacy components)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a path is active (compatibility function)
 */
export function isPathActive(pathname: string, href: string): boolean {
  if (href === '/dashboard' || href === '/admin' || href === '/attorney') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * User menu items (compatibility export)
 */
export const USER_MENU_ITEMS: NavItem[] = [
  { label: 'Profile Settings', href: '/settings/profile', icon: undefined },
];

/**
 * Admin menu items (compatibility export)
 */
export const ADMIN_MENU_ITEMS: NavItem[] = [
  { label: 'Organization Settings', href: '/admin/firm', icon: undefined },
  { label: 'Security', href: '/admin/security', icon: undefined },
];

/**
 * Public navigation items (compatibility export)
 */
export const PUBLIC_NAV_ITEMS: NavItem[] = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Security', href: '/security' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

/**
 * Role display names (compatibility export)
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  REPORTER: 'Court Reporter',
  SCOPIST: 'Scopist',
  ATTORNEY: 'Attorney',
  AGENCY: 'Agency Admin',
};
