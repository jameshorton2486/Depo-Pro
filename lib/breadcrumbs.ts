// ═══════════════════════════════════════════════════════════════
// BREADCRUMB GENERATION
// ═══════════════════════════════════════════════════════════════
// Utilities for generating breadcrumbs from routes and navigation

import { getBreadcrumbs, type UserRole } from '@/lib/navigation';

/**
 * Generate breadcrumbs for a route based on user role
 */
export function generateBreadcrumbs(role: UserRole, pathname: string): Array<{ label: string; href: string }> {
  return getBreadcrumbs(role, pathname);
}

/**
 * Simple breadcrumb item type
 */
export interface BreadcrumbItem {
  label: string;
  href?: string; // If undefined, this is the current page (non-clickable)
}

/**
 * Generate breadcrumbs from a pathname
 */
export function pathnameToBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    breadcrumbs.push({
      label,
      href: currentPath,
    });
  }

  // Make the last item non-clickable (current page)
  if (breadcrumbs.length > 0) {
    const last = breadcrumbs[breadcrumbs.length - 1];
    delete last.href;
  }

  return breadcrumbs;
}
