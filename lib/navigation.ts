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
  id: string; // Unique identifier for React keys
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
      { id: 'admin-overview', label: 'Overview', href: '/admin', icon: LayoutDashboard, description: 'System overview and stats' },
      { id: 'admin-activity', label: 'Activity Feed', href: '/admin/activity', icon: Activity, description: 'Recent system activity' },
    ],
  },
  {
    section: 'Cases & Jobs',
    icon: Briefcase,
    items: [
      { id: 'admin-all-jobs', label: 'All Jobs', href: '/jobs', icon: Briefcase, description: 'View and manage all jobs' },
      { id: 'admin-new-case', label: 'New Case (AI Intake)', href: '/cases/new', icon: PlusCircle, description: 'Upload NOD, CSR paperwork, audio' },
      { id: 'admin-new-job', label: 'New Job (Manual)', href: '/jobs/new', icon: Upload, description: 'Create job manually' },
      { id: 'admin-calendar', label: 'Calendar', href: '/calendar', icon: Calendar, description: 'Deposition schedule' },
      { id: 'admin-booking-requests', label: 'Booking Requests', href: '/calendar/requests', icon: ListTodo, description: 'Pending scheduling requests' },
    ],
  },
  {
    section: 'Transcripts',
    icon: FileText,
    items: [
      { id: 'admin-transcripts-in-progress', label: 'In Progress', href: '/jobs?status=IN_EDIT', icon: Clock, description: 'Currently being edited' },
      { id: 'admin-transcripts-ready', label: 'Ready for Review', href: '/jobs?status=READY_FOR_EDIT', icon: FileAudio, description: 'AI processing complete' },
      { id: 'admin-transcripts-completed', label: 'Completed', href: '/jobs?status=COMPLETED', icon: CheckCircle, description: 'Finalized transcripts' },
    ],
  },
  {
    section: 'People',
    icon: Users,
    items: [
      { id: 'admin-users-all', label: 'All Users', href: '/admin/users', icon: Users, description: 'Manage all users' },
      { id: 'admin-users-reporters', label: 'Court Reporters', href: '/admin/users?role=REPORTER', icon: Mic, description: 'Reporter accounts' },
      { id: 'admin-users-scopists', label: 'Scopists', href: '/admin/users?role=SCOPIST', icon: UserCircle, description: 'Scopist accounts' },
      { id: 'admin-users-attorneys', label: 'Attorneys', href: '/admin/users?role=ATTORNEY', icon: Scale, description: 'Attorney accounts' },
      { id: 'admin-users-agencies', label: 'Agencies', href: '/admin/users?role=AGENCY', icon: Building2, description: 'Agency accounts' },
    ],
  },
  {
    section: 'Billing',
    icon: CreditCard,
    items: [
      { id: 'admin-billing-overview', label: 'Overview', href: '/billing', icon: CreditCard, description: 'Billing dashboard' },
      { id: 'admin-rx-queue', label: 'RX Queue', href: '/admin/rx-queue', icon: FileAudio, description: 'Manual audio enhancement queue' },
    ],
  },
  {
    section: 'Reports',
    icon: BarChart3,
    items: [
      { id: 'admin-reports-usage', label: 'Usage Reports', href: '/admin/reports/usage', icon: BarChart3, description: 'Platform usage stats' },
      { id: 'admin-reports-billing', label: 'Billing Reports', href: '/admin/reports/billing', icon: CreditCard, description: 'Revenue and billing' },
      { id: 'admin-reports-accuracy', label: 'Accuracy Metrics', href: '/admin/reports/accuracy', icon: CheckCircle, description: 'AI transcription accuracy' },
    ],
  },
  {
    section: 'System',
    icon: Settings,
    items: [
      { id: 'admin-settings-profile', label: 'Settings', href: '/settings/profile', icon: Settings, description: 'Profile settings' },
      { id: 'admin-settings-firm', label: 'Firm Settings', href: '/admin/firm', icon: Building2, description: 'Firm configuration' },
      { id: 'admin-settings-security', label: 'Security', href: '/admin/security', icon: Shield, description: 'Security settings' },
      { id: 'admin-settings-integrations', label: 'Integrations', href: '/admin/integrations', icon: Webhook, description: 'Third-party integrations' },
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
      { id: 'reporter-dashboard', label: 'My Dashboard', href: '/reporter', icon: LayoutDashboard, description: 'Your overview' },
    ],
  },
  {
    section: 'Jobs',
    icon: Briefcase,
    items: [
      { id: 'reporter-my-jobs', label: 'My Jobs', href: '/jobs', icon: Briefcase, description: 'Your transcription jobs' },
      { id: 'reporter-new-case', label: 'New Case (AI Intake)', href: '/cases/new', icon: PlusCircle, description: 'Upload NOD, CSR paperwork, audio' },
      { id: 'reporter-new-job', label: 'New Job (Manual)', href: '/jobs/new', icon: Upload, description: 'Create job manually' },
    ],
  },
  {
    section: 'Schedule',
    icon: Calendar,
    items: [
      { id: 'reporter-calendar', label: 'Calendar', href: '/calendar', icon: Calendar, description: 'Deposition schedule' },
      { id: 'reporter-availability', label: 'My Availability', href: '/calendar/availability', icon: Clock, description: 'Set your availability' },
    ],
  },
  {
    section: 'Transcripts',
    icon: FileText,
    items: [
      { id: 'reporter-transcripts-ready', label: 'Ready for Review', href: '/jobs?status=READY_FOR_EDIT', icon: FileAudio, description: 'AI processing complete' },
      { id: 'reporter-transcripts-scopist', label: 'With Scopist', href: '/jobs?status=ASSIGNED', icon: UserCircle, description: 'Assigned to scopist' },
      { id: 'reporter-transcripts-completed', label: 'Completed', href: '/jobs?status=COMPLETED', icon: CheckCircle, description: 'Finalized transcripts' },
    ],
  },
  {
    section: 'Settings',
    icon: Settings,
    items: [
      { id: 'reporter-settings-profile', label: 'Profile', href: '/settings/profile', icon: Settings, description: 'Your profile settings' },
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
      { id: 'scopist-dashboard', label: 'My Dashboard', href: '/scopist', icon: LayoutDashboard, description: 'Your overview' },
    ],
  },
  {
    section: 'Assignments',
    icon: Briefcase,
    items: [
      { id: 'scopist-assignments', label: 'My Assignments', href: '/jobs?assigned=me', icon: Briefcase, description: 'Jobs assigned to you' },
      { id: 'scopist-available-jobs', label: 'Available Jobs', href: '/jobs?status=READY_FOR_EDIT', icon: FolderOpen, description: 'Jobs available to claim' },
    ],
  },
  {
    section: 'Work Queue',
    icon: FileText,
    items: [
      { id: 'scopist-work-in-progress', label: 'In Progress', href: '/jobs?status=IN_EDIT&assigned=me', icon: Clock, description: 'Currently editing' },
      { id: 'scopist-work-submitted', label: 'Submitted', href: '/jobs?status=SUBMITTED_FOR_REVIEW&assigned=me', icon: CheckCircle, description: 'Awaiting review' },
    ],
  },
  {
    section: 'Settings',
    icon: Settings,
    items: [
      { id: 'scopist-settings-profile', label: 'Profile', href: '/settings/profile', icon: Settings, description: 'Your profile settings' },
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
      { id: 'attorney-dashboard', label: 'My Dashboard', href: '/attorney-dashboard', icon: LayoutDashboard, description: 'Your overview' },
    ],
  },
  {
    section: 'Cases',
    icon: Briefcase,
    items: [
      { id: 'attorney-cases', label: 'My Cases', href: '/attorney/cases', icon: Briefcase, description: 'Cases you are involved in' },
      { id: 'attorney-calendar', label: 'Calendar', href: '/calendar', icon: Calendar, description: 'Upcoming depositions' },
    ],
  },
  {
    section: 'Transcripts',
    icon: FileText,
    items: [
      { id: 'attorney-transcripts-all', label: 'All Transcripts', href: '/attorney/transcripts', icon: FileText, description: 'View your transcripts' },
      { id: 'attorney-transcripts-recent', label: 'Recent', href: '/attorney/transcripts?sort=recent', icon: Clock, description: 'Recently updated' },
    ],
  },
  {
    section: 'Exhibits',
    icon: FolderOpen,
    items: [
      { id: 'attorney-exhibits', label: 'All Exhibits', href: '/attorney/exhibits', icon: FolderOpen, description: 'Case exhibits' },
    ],
  },
  {
    section: 'Reports',
    icon: BarChart3,
    items: [
      { id: 'attorney-reports', label: 'Case Reports', href: '/attorney/reports', icon: BarChart3, description: 'Generate reports' },
      { id: 'attorney-issues', label: 'Issues', href: '/attorney/issues', icon: MessageSquare, description: 'Transcript issues' },
    ],
  },
  {
    section: 'Settings',
    icon: Settings,
    items: [
      { id: 'attorney-settings-profile', label: 'Profile', href: '/settings/profile', icon: Settings, description: 'Your profile settings' },
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
      { id: 'agency-dashboard', label: 'Agency Dashboard', href: '/admin', icon: LayoutDashboard, description: 'Agency overview' },
    ],
  },
  {
    section: 'Jobs',
    icon: Briefcase,
    items: [
      { id: 'agency-all-jobs', label: 'All Jobs', href: '/jobs', icon: Briefcase, description: 'All agency jobs' },
      { id: 'agency-new-case', label: 'New Case (AI Intake)', href: '/cases/new', icon: PlusCircle, description: 'Upload NOD, CSR paperwork, audio' },
      { id: 'agency-new-job', label: 'New Job (Manual)', href: '/jobs/new', icon: Upload, description: 'Create job manually' },
    ],
  },
  {
    section: 'Schedule',
    icon: Calendar,
    items: [
      { id: 'agency-calendar', label: 'Calendar', href: '/calendar', icon: Calendar, description: 'Deposition schedule' },
      { id: 'agency-booking-requests', label: 'Booking Requests', href: '/calendar/requests', icon: ListTodo, description: 'Pending requests' },
      { id: 'agency-new-booking', label: 'New Booking', href: '/calendar/requests/new', icon: PlusCircle, description: 'Create booking request' },
    ],
  },
  {
    section: 'Team',
    icon: Users,
    items: [
      { id: 'agency-team-reporters', label: 'Reporters', href: '/admin/users?role=REPORTER', icon: Mic, description: 'Court reporters' },
      { id: 'agency-team-scopists', label: 'Scopists', href: '/admin/users?role=SCOPIST', icon: UserCircle, description: 'Scopists' },
    ],
  },
  {
    section: 'Billing',
    icon: CreditCard,
    items: [
      { id: 'agency-billing-overview', label: 'Overview', href: '/billing', icon: CreditCard, description: 'Billing dashboard' },
      { id: 'agency-rx-queue', label: 'RX Queue', href: '/admin/rx-queue', icon: FileAudio, description: 'Audio enhancement queue' },
    ],
  },
  {
    section: 'Settings',
    icon: Settings,
    items: [
      { id: 'agency-settings-profile', label: 'Profile', href: '/settings/profile', icon: Settings, description: 'Profile settings' },
      { id: 'agency-settings-firm', label: 'Agency Settings', href: '/admin/firm', icon: Building2, description: 'Agency configuration' },
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

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION: Ensure unique nav IDs across all schemas
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assert that all navigation item IDs are globally unique across all role schemas.
 * This prevents React key conflicts and ensures stable navigation state.
 * 
 * @throws Error if duplicate IDs are detected
 */
function assertUniqueNavIds(): void {
  const ids = new Set<string>();
  const duplicates: Array<{ id: string; role: UserRole; section: string; label: string }> = [];

  for (const [role, schema] of Object.entries(NAVIGATION) as Array<[UserRole, NavigationSchema]>) {
    for (const section of schema) {
      for (const item of section.items) {
        if (ids.has(item.id)) {
          duplicates.push({ id: item.id, role, section: section.section, label: item.label });
        } else {
          ids.add(item.id);
        }
      }
    }
  }

  if (duplicates.length > 0) {
    const errorDetails = duplicates
      .map((d) => `  - "${d.id}" in ${d.role} → ${d.section} → ${d.label}`)
      .join('\n');
    throw new Error(
      `Duplicate navigation IDs detected. Each nav item must have a globally unique ID.\n\nDuplicates:\n${errorDetails}\n\nFix: Use role-scoped IDs: <role>-<section>-<item>`
    );
  }
}

// Run validation in development mode to catch duplicate IDs early
if (process.env.NODE_ENV !== 'production') {
  assertUniqueNavIds();
}

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
  if (href === '/dashboard' || href === '/admin' || href === '/attorney-dashboard') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * User menu items (compatibility export)
 */
export const USER_MENU_ITEMS: NavItem[] = [
  { id: 'user-menu-profile', label: 'Profile Settings', href: '/settings/profile', icon: undefined },
];

/**
 * Admin menu items (compatibility export)
 */
export const ADMIN_MENU_ITEMS: NavItem[] = [
  { id: 'admin-menu-organization', label: 'Organization Settings', href: '/admin/firm', icon: undefined },
  { id: 'admin-menu-security', label: 'Security', href: '/admin/security', icon: undefined },
];

/**
 * Public navigation items (compatibility export)
 */
export const PUBLIC_NAV_ITEMS: NavItem[] = [
  { id: 'public-features', label: 'Features', href: '/features' },
  { id: 'public-pricing', label: 'Pricing', href: '/pricing' },
  { id: 'public-security', label: 'Security', href: '/security' },
  { id: 'public-about', label: 'About', href: '/about' },
  { id: 'public-contact', label: 'Contact', href: '/contact' },
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
