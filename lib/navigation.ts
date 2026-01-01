// ═══════════════════════════════════════════════════════════════
// ROLE-BASED NAVIGATION SCHEMA
// ═══════════════════════════════════════════════════════════════
// Centralized navigation configuration for all user roles
// Used by AppNavbar and other navigation components

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
  Building2,
  Scale,
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
  badge?: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

// Main navigation items by role
export const NAVIGATION: Record<UserRole, NavItem[]> = {
  COURT_REPORTER: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Jobs', href: '/jobs', icon: Briefcase },
    { label: 'My Availability', href: '/calendar/availability', icon: Calendar },
  ],

  SCOPIST: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Assignments', href: '/jobs', icon: ClipboardList },
    { label: 'Review Queue', href: '/jobs?status=IN_REVIEW', icon: FileText },
  ],

  ADMIN: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Jobs', href: '/jobs', icon: Briefcase },
    { label: 'Booking Requests', href: '/calendar/requests', icon: ClipboardList },
    { label: 'Admin', href: '/admin', icon: Settings },
  ],

  AGENCY: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Jobs', href: '/jobs', icon: Briefcase },
    { label: 'Booking Requests', href: '/calendar/requests', icon: ClipboardList },
    { label: 'Team', href: '/admin/users', icon: Users },
    { label: 'Billing', href: '/billing', icon: Receipt },
  ],

  ATTORNEY: [
    { label: 'Dashboard', href: '/attorney', icon: LayoutDashboard },
    { label: 'Cases', href: '/attorney/cases', icon: Scale },
    { label: 'Transcripts', href: '/attorney/transcripts', icon: FileText },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
  ],

  VIDEOGRAPHER: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Jobs', href: '/jobs', icon: Briefcase },
    { label: 'My Availability', href: '/calendar/availability', icon: Calendar },
  ],

  INTERPRETER: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Jobs', href: '/jobs', icon: Briefcase },
    { label: 'My Availability', href: '/calendar/availability', icon: Calendar },
  ],
};

// User menu items (same for all roles, some conditionally shown)
export const USER_MENU_ITEMS: NavItem[] = [
  { label: 'Profile Settings', href: '/settings/profile', icon: Settings },
];

// Admin-only menu items
export const ADMIN_MENU_ITEMS: NavItem[] = [
  { label: 'Organization Settings', href: '/admin/settings', icon: Building2 },
  { label: 'Audit Logs', href: '/admin/audit', icon: ScrollText },
];

// Public navigation items (for unauthenticated users)
export const PUBLIC_NAV_ITEMS: NavItem[] = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Security', href: '/security' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

// Helper function to get navigation for a role
export function getNavigationForRole(role: UserRole): NavItem[] {
  return NAVIGATION[role] || NAVIGATION.COURT_REPORTER;
}

// Helper function to check if a path is active
export function isPathActive(pathname: string, href: string): boolean {
  if (href === '/dashboard' || href === '/admin' || href === '/attorney') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Role display names
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  COURT_REPORTER: 'Court Reporter',
  SCOPIST: 'Scopist',
  VIDEOGRAPHER: 'Videographer',
  INTERPRETER: 'Interpreter',
  AGENCY: 'Agency Admin',
  ATTORNEY: 'Attorney',
};
