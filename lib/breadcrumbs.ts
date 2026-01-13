// ═══════════════════════════════════════════════════════════════
// BREADCRUMB GENERATION - TYPE-SAFE & DEDUPLICATED
// ═══════════════════════════════════════════════════════════════
// Utilities for generating breadcrumbs from routes and navigation
// Ensures no duplicates, stable IDs, and canonical labels
// ═══════════════════════════════════════════════════════════════

import { getBreadcrumbs, type UserRole } from '@/lib/navigation';

// =============================================================================
// TYPE-SAFE BREADCRUMB MODEL
// =============================================================================

/**
 * Type-safe breadcrumb item with stable ID
 * IDs are normalized from href to ensure uniqueness
 */
export interface BreadcrumbItem {
  id: string; // Stable, unique identifier (normalized from href)
  href: string; // Route path
  label: string; // Display label
}

// =============================================================================
// CANONICAL ROUTE LABELS
// =============================================================================

/**
 * Canonical route labels - single source of truth
 * If a route already has a label in navigation schema, it's used here
 * Otherwise, this provides fallback labels
 */
const ROUTE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/admin': 'Admin',
  '/reporter': 'Reporter',
  '/scopist': 'Scopist',
  '/attorney-dashboard': 'Attorney Dashboard',
  '/agency': 'Agency',
  '/jobs': 'Jobs',
  '/jobs/new': 'New Job',
  '/cases': 'Cases',
  '/cases/new': 'New Case',
  '/calendar': 'Calendar',
  '/transcripts': 'Transcripts',
  '/settings': 'Settings',
  '/settings/profile': 'Profile',
  '/billing': 'Billing',
  '/reports': 'Reports',
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Normalize href to create stable ID
 * Removes trailing slashes, query params, and hash
 */
function normalizeHref(href: string): string {
  try {
    const url = new URL(href, 'http://localhost');
    return url.pathname.replace(/\/$/, '') || '/';
  } catch {
    // If URL parsing fails, just clean the path
    return href.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  }
}

/**
 * Generate stable ID from href
 * Ensures uniqueness across breadcrumb items
 */
function generateBreadcrumbId(href: string): string {
  const normalized = normalizeHref(href);
  return `breadcrumb-${normalized.replace(/\//g, '-').replace(/^-/, '') || 'home'}`;
}

/**
 * Get canonical label for a route
 * Checks navigation schema first, then fallback map
 */
function getCanonicalLabel(
  href: string,
  role: UserRole,
  navigationLabel?: string
): string {
  // Use navigation label if provided (most authoritative)
  if (navigationLabel) {
    return navigationLabel;
  }

  // Check canonical route labels
  const normalized = normalizeHref(href);
  if (ROUTE_LABELS[normalized]) {
    return ROUTE_LABELS[normalized];
  }

  // Fallback: generate from path segments
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) {
    return 'Home';
  }

  return segments
    .map((segment) =>
      segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(' / ');
}

// =============================================================================
// DEDUPLICATION LOGIC
// =============================================================================

/**
 * Deduplicate breadcrumbs by normalized href
 * Preserves original order, keeps first occurrence
 * Runs BEFORE rendering - not in JSX
 */
function deduplicateBreadcrumbs(
  items: Array<{ label: string; href: string }>
): BreadcrumbItem[] {
  // Use Map to deduplicate by normalized href
  const seen = new Map<string, BreadcrumbItem>();

  for (const item of items) {
    const normalizedHref = normalizeHref(item.href);

    // Only add if we haven't seen this href before
    if (!seen.has(normalizedHref)) {
      seen.set(normalizedHref, {
        id: generateBreadcrumbId(item.href),
        href: normalizedHref,
        label: item.label,
      });
    }
  }

  // Return in original order
  return Array.from(seen.values());
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Generate breadcrumbs for a route based on user role
 * Returns type-safe, deduplicated breadcrumbs with stable IDs
 */
export function generateBreadcrumbs(
  role: UserRole,
  pathname: string
): BreadcrumbItem[] {
  // Get breadcrumbs from navigation schema
  const navBreadcrumbs = getBreadcrumbs(role, pathname);

  // Convert to type-safe format with canonical labels
  const breadcrumbItems: BreadcrumbItem[] = navBreadcrumbs.map((item) => ({
    id: generateBreadcrumbId(item.href),
    href: normalizeHref(item.href),
    label: getCanonicalLabel(item.href, role, item.label),
  }));

  // Always include Home
  const homeItem: BreadcrumbItem = {
    id: 'breadcrumb-home',
    href: '/',
    label: 'Home',
  };

  // Combine and deduplicate
  const allItems = [homeItem, ...breadcrumbItems];
  return deduplicateBreadcrumbs(allItems);
}

/**
 * Generate breadcrumbs from a pathname (fallback)
 * Used when navigation schema doesn't have the route
 */
export function pathnameToBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    {
      id: 'breadcrumb-home',
      href: '/',
      label: 'Home',
    },
  ];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const normalized = normalizeHref(currentPath);

    breadcrumbs.push({
      id: generateBreadcrumbId(normalized),
      href: normalized,
      label: getCanonicalLabel(normalized, 'REPORTER'), // Default role
    });
  }

  // Make the last item non-clickable (current page) by removing href
  // But keep it in the array for rendering
  if (breadcrumbs.length > 0) {
    // Mark as current page (component will handle non-clickable)
    return breadcrumbs;
  }

  return breadcrumbs;
}

/**
 * Normalize breadcrumb items (ensure type safety and deduplication)
 * Use this before rendering to guarantee no duplicates
 */
export function normalizeBreadcrumbs(
  items: Array<{ label: string; href?: string }>
): BreadcrumbItem[] {
  // Filter out items without href (they're placeholders)
  const withHref = items.filter((item): item is { label: string; href: string } =>
    !!item.href
  );

  // Convert to type-safe format
  const typed: BreadcrumbItem[] = withHref.map((item) => ({
    id: generateBreadcrumbId(item.href),
    href: normalizeHref(item.href),
    label: item.label,
  }));

  // Deduplicate
  return deduplicateBreadcrumbs(typed);
}
