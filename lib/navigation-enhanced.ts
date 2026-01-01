// ═══════════════════════════════════════════════════════════════
// ENHANCED ROLE-BASED NAVIGATION SCHEMA
// ═══════════════════════════════════════════════════════════════
// Hierarchical navigation with sections for better organization
// This extends the existing flat navigation structure

import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  FileText,
  ClipboardList,
  Users,
  Receipt,
  ScrollText,
  Settings,
  Scale,
  BarChart3,
  Shield,
  Webhook,
  Package,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type UserRole =
  | 'ADMIN'
  | 'COURT_REPORTER'
  | 'SCOPIST'
  | 'VIDEOGRAPHER'
  | 'INTERPRETER'
  | 'AGENCY'
  | 'ATTORNEY';

export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: string | number;
  description?: string;
  external?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface NavConfig {
  sections: NavSection[];
  standalone?: NavItem[]; // Items that appear outside sections (e.g., Dashboard)
}

/**
 * ADMIN Navigation - Full access with hierarchical organization
 * Designed for system administrators who need to navigate all areas
 */
export const ADMIN_NAV: NavConfig = {
  standalone: [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      description: 'System overview and activity',
    },
  ],
  sections: [
    {
      label: 'Cases & Jobs',
      items: [
        {
          label: 'All Cases',
          href: '/jobs',
          icon: Briefcase,
          description: 'View and manage all deposition jobs',
        },
        {
          label: 'Calendar',
          href: '/calendar',
          icon: Calendar,
          description: 'Deposition schedule and availability',
        },
        {
          label: 'Assignments',
          href: '/jobs?status=ASSIGNED',
          icon: ClipboardList,
          description: 'Manage scopist assignments',
        },
        {
          label: 'Booking Requests',
          href: '/calendar/requests',
          icon: CheckSquare,
          description: 'Review and approve bookings',
        },
      ],
    },
    {
      label: 'Transcripts',
      items: [
        {
          label: 'Live Transcripts',
          href: '/transcripts?status=LIVE',
          icon: FileText,
          description: 'Active transcription sessions',
        },
        {
          label: 'Review Queue',
          href: '/jobs?status=IN_REVIEW',
          icon: AlertCircle,
          badge: 'new',
          description: 'Transcripts awaiting review',
        },
        {
          label: 'Completed',
          href: '/transcripts?status=COMPLETED',
          icon: CheckSquare,
          description: 'Finished transcripts',
        },
      ],
    },
    {
      label: 'People',
      items: [
        {
          label: 'Court Reporters',
          href: '/admin/users?role=COURT_REPORTER',
          icon: Users,
          description: 'Manage reporters',
        },
        {
          label: 'Scopists',
          href: '/admin/users?role=SCOPIST',
          icon: Users,
          description: 'Manage scopists',
        },
        {
          label: 'Attorneys',
          href: '/admin/users?role=ATTORNEY',
          icon: Scale,
          description: 'Manage attorney accounts',
        },
        {
          label: 'All Users',
          href: '/admin/users',
          icon: Users,
          description: 'Complete user directory',
        },
      ],
    },
    {
      label: 'System',
      items: [
        {
          label: 'Settings',
          href: '/admin/settings',
          icon: Settings,
          description: 'System configuration',
        },
        {
          label: 'Security',
          href: '/admin/security',
          icon: Shield,
          description: 'Security and compliance',
        },
        {
          label: 'Audit Logs',
          href: '/admin/audit',
          icon: ScrollText,
          description: 'System activity logs',
        },
        {
          label: 'Integrations',
          href: '/admin/integrations',
          icon: Webhook,
          description: 'Third-party integrations',
        },
        {
          label: 'Billing',
          href: '/admin/billing',
          icon: Receipt,
          description: 'Billing and subscriptions',
        },
      ],
    },
    {
      label: 'Reports',
      items: [
        {
          label: 'Usage Analytics',
          href: '/admin/reports/usage',
          icon: BarChart3,
          description: 'System usage metrics',
        },
        {
          label: 'Accuracy Reports',
          href: '/admin/reports/accuracy',
          icon: CheckSquare,
          description: 'Transcription accuracy data',
        },
      ],
    },
  ],
};

/**
 * ATTORNEY Navigation - Restricted access
 * Attorneys see only their cases and transcripts
 */
export const ATTORNEY_NAV: NavConfig = {
  standalone: [
    {
      label: 'Dashboard',
      href: '/attorney',
      icon: LayoutDashboard,
      description: 'My cases overview',
    },
  ],
  sections: [
    {
      label: 'My Work',
      items: [
        {
          label: 'Cases',
          href: '/attorney/cases',
          icon: Scale,
          description: 'My assigned cases',
        },
        {
          label: 'Transcripts',
          href: '/attorney/transcripts',
          icon: FileText,
          description: 'Accessible transcripts',
        },
        {
          label: 'Exhibits',
          href: '/attorney/exhibits',
          icon: Package,
          description: 'Case exhibits and documents',
        },
      ],
    },
  ],
};

/**
 * COURT_REPORTER Navigation
 */
export const REPORTER_NAV: NavConfig = {
  standalone: [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
  ],
  sections: [
    {
      label: 'Work',
      items: [
        {
          label: 'My Jobs',
          href: '/jobs',
          icon: Briefcase,
        },
        {
          label: 'Calendar',
          href: '/calendar',
          icon: Calendar,
        },
        {
          label: 'Availability',
          href: '/calendar/availability',
          icon: Calendar,
        },
      ],
    },
  ],
};

/**
 * SCOPIST Navigation
 */
export const SCOPIST_NAV: NavConfig = {
  standalone: [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
  ],
  sections: [
    {
      label: 'Assignments',
      items: [
        {
          label: 'Review Queue',
          href: '/jobs?status=IN_REVIEW',
          icon: FileText,
          badge: 'new',
        },
        {
          label: 'Active Jobs',
          href: '/jobs',
          icon: Briefcase,
        },
      ],
    },
  ],
};

/**
 * AGENCY Navigation
 */
export const AGENCY_NAV: NavConfig = {
  standalone: [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
  ],
  sections: [
    {
      label: 'Operations',
      items: [
        {
          label: 'All Jobs',
          href: '/jobs',
          icon: Briefcase,
        },
        {
          label: 'Calendar',
          href: '/calendar',
          icon: Calendar,
        },
        {
          label: 'Team',
          href: '/admin/users',
          icon: Users,
        },
        {
          label: 'Billing',
          href: '/billing',
          icon: Receipt,
        },
      ],
    },
  ],
};

/**
 * Main navigation map
 */
export const NAVIGATION_CONFIG: Record<UserRole, NavConfig> = {
  ADMIN: ADMIN_NAV,
  ATTORNEY: ATTORNEY_NAV,
  COURT_REPORTER: REPORTER_NAV,
  SCOPIST: SCOPIST_NAV,
  AGENCY: AGENCY_NAV,
  VIDEOGRAPHER: REPORTER_NAV, // Same as reporter for now
  INTERPRETER: REPORTER_NAV, // Same as reporter for now
};

/**
 * Get navigation config for a role
 */
export function getNavigationForRole(role: UserRole): NavConfig {
  return NAVIGATION_CONFIG[role] || REPORTER_NAV;
}

/**
 * Flatten navigation for use in top navbar (backward compatibility)
 */
export function flattenNavigation(config: NavConfig): NavItem[] {
  const items: NavItem[] = [];
  if (config.standalone) {
    items.push(...config.standalone);
  }
  config.sections.forEach((section) => {
    items.push(...section.items);
  });
  return items;
}

/**
 * Check if a path is active
 */
export function isPathActive(pathname: string, href: string): boolean {
  // Exact match for dashboard/admin/attorney roots
  if (href === '/dashboard' || href === '/admin' || href === '/attorney') {
    return pathname === href;
  }
  // Prefix match for nested routes
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Role display names (exported for use in UI)
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  COURT_REPORTER: 'Court Reporter',
  SCOPIST: 'Scopist',
  VIDEOGRAPHER: 'Videographer',
  INTERPRETER: 'Interpreter',
  AGENCY: 'Agency Admin',
  ATTORNEY: 'Attorney',
};
