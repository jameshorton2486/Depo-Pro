// ═══════════════════════════════════════════════════════════════
// BREADCRUMBS COMPONENT
// ═══════════════════════════════════════════════════════════════
// Displays navigation breadcrumbs based on current route and user role

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateBreadcrumbs, pathnameToBreadcrumbs, normalizeBreadcrumbs, type BreadcrumbItem } from '@/lib/breadcrumbs';
import { type UserRole } from '@/lib/navigation';

interface BreadcrumbsProps {
  role: UserRole;
  className?: string;
  items?: BreadcrumbItem[]; // Override with custom breadcrumbs
}

/**
 * Main Breadcrumbs component - uses navigation schema for role-aware breadcrumbs
 * Deduplicates at source before rendering
 */
export function Breadcrumbs({ role, className, items }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Generate breadcrumbs (already deduplicated and type-safe)
  let breadcrumbItems: BreadcrumbItem[];
  
  if (items) {
    // Normalize custom items to ensure type safety and deduplication
    breadcrumbItems = normalizeBreadcrumbs(items);
  } else {
    // Generate from navigation schema (already deduplicated)
    breadcrumbItems = generateBreadcrumbs(role, pathname);
  }

  // If no breadcrumbs from navigation, fall back to pathname-based
  const finalItems: BreadcrumbItem[] = breadcrumbItems.length > 0 
    ? breadcrumbItems 
    : pathnameToBreadcrumbs(pathname);

  if (finalItems.length === 0) {
    return null;
  }

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn('flex items-center space-x-2 text-sm text-muted-foreground', className)}
    >
      <ol className="flex items-center space-x-2">
        {finalItems.map((item, index) => {
          const isLast = index === finalItems.length - 1;

          return (
            <li key={item.id} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {index === 0 ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    <span>{item.label}</span>
                  )}
                </Link>
              ) : (
                <span className={cn(isLast && 'text-foreground font-medium')}>
                  {index === 0 ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    item.label
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Simple breadcrumbs for custom use cases
 */
export function SimpleBreadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn('flex items-center space-x-2 text-sm text-muted-foreground', className)}
    >
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.id} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast && 'text-foreground font-medium')}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
