import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* =============================================================================
   PAGE LAYOUT COMPONENTS
   Consistent page structure across the application
   ============================================================================= */

/**
 * Page Container
 * Main wrapper for page content with responsive padding
 */
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide" | "full";
}

export function PageContainer({
  children,
  className,
  size = "default",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto px-4 sm:px-6 lg:px-8",
        {
          "max-w-7xl": size === "default",
          "max-w-3xl": size === "narrow",
          "max-w-screen-2xl": size === "wide",
          "max-w-none": size === "full",
        },
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Page Header
 * Standard page header with title, subtitle, and optional actions
 */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode; // Actions slot
  breadcrumbs?: Array<{ label: string; href?: string }>;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  children,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("page-header", className)}>
      <PageContainer>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} className="mb-4" />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
          {children && (
            <div className="flex items-center gap-3 shrink-0">{children}</div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}

/**
 * Page Content
 * Main content area with consistent spacing
 */
interface PageContentProps {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide" | "full";
}

export function PageContent({
  children,
  className,
  size = "default",
}: PageContentProps) {
  return (
    <main className={cn("page-content", className)}>
      <PageContainer size={size}>{children}</PageContainer>
    </main>
  );
}

/* =============================================================================
   HERO SECTIONS
   ============================================================================= */

/**
 * Hero Section
 * Full-width hero with gradient background
 */
interface HeroProps {
  children: React.ReactNode;
  className?: string;
  variant?: "dark" | "light";
  pattern?: boolean;
}

export function Hero({
  children,
  className,
  variant = "dark",
  pattern = true,
}: HeroProps) {
  return (
    <section
      className={cn(
        "hero",
        variant === "light" && "hero-light",
        className
      )}
    >
      {pattern && <div className="hero-pattern" aria-hidden="true" />}
      <div className="hero-content">
        <PageContainer>{children}</PageContainer>
      </div>
    </section>
  );
}

/**
 * Hero Title
 */
export function HeroTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        "text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight",
        className
      )}
    >
      {children}
    </h1>
  );
}

/**
 * Hero Subtitle
 */
export function HeroSubtitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mt-6 text-lg sm:text-xl opacity-90 max-w-2xl",
        className
      )}
    >
      {children}
    </p>
  );
}

/* =============================================================================
   BREADCRUMBS
   ============================================================================= */

interface BreadcrumbsProps {
  items: Array<{ label: string; href?: string }>;
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("breadcrumb", className)}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 && (
            <ChevronIcon className="w-4 h-4 breadcrumb-separator" />
          )}
          {item.href && index < items.length - 1 ? (
            <Link href={item.href} className="breadcrumb-link">
              {item.label}
            </Link>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

/* =============================================================================
   CARDS
   ============================================================================= */

interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className,
  interactive = false,
  onClick,
}: CardProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={cn(
        "card-depo",
        interactive && "card-depo-interactive cursor-pointer",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("card-header-depo", className)}>{children}</div>;
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("text-lg font-semibold", className)}>{children}</h3>
  );
}

export function CardDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-muted-foreground mt-1", className)}>
      {children}
    </p>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("card-body-depo", className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("card-footer-depo", className)}>{children}</div>;
}

/* =============================================================================
   STAT CARDS
   ============================================================================= */

interface StatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: string;
    positive?: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  icon,
  className,
}: StatCardProps) {
  return (
    <div className={cn("stat-card", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value">{value}</p>
          {change && (
            <p
              className={cn(
                "stat-change",
                change.positive ? "stat-change-positive" : "stat-change-negative"
              )}
            >
              {change.positive ? "↑" : "↓"} {change.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   EMPTY STATE
   ============================================================================= */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("empty-state", className)}>
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* =============================================================================
   BADGES
   ============================================================================= */

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "reporter"
  | "scopist"
  | "admin";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  const variantClasses: Record<BadgeVariant, string> = {
    default: "bg-muted text-muted-foreground",
    primary: "badge-primary",
    success: "badge-success",
    warning: "badge-warning",
    error: "badge-error",
    info: "badge-info",
    reporter: "badge-reporter",
    scopist: "badge-scopist",
    admin: "badge-admin",
  };

  return (
    <span className={cn("badge-depo", variantClasses[variant], className)}>
      {children}
    </span>
  );
}

/**
 * Status Badge - For job status
 */
type StatusBadgeVariant =
  | "pending"
  | "processing"
  | "review"
  | "complete"
  | "failed";

interface StatusBadgeProps {
  status: StatusBadgeVariant;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig: Record<
    StatusBadgeVariant,
    { label: string; className: string }
  > = {
    pending: { label: "Pending", className: "badge-status-pending" },
    processing: { label: "Processing", className: "badge-status-processing" },
    review: { label: "In Review", className: "badge-status-review" },
    complete: { label: "Complete", className: "badge-status-complete" },
    failed: { label: "Failed", className: "badge-status-failed" },
  };

  const config = statusConfig[status];

  return (
    <span className={cn("badge-depo", config.className, className)}>
      {config.label}
    </span>
  );
}

/* =============================================================================
   DIVIDER
   ============================================================================= */

interface DividerProps {
  className?: string;
  label?: string;
}

export function Divider({ className, label }: DividerProps) {
  if (label) {
    return (
      <div className={cn("relative my-6", className)}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-sm text-muted-foreground">
            {label}
          </span>
        </div>
      </div>
    );
  }

  return <hr className={cn("border-t border-border my-6", className)} />;
}

/* =============================================================================
   LOADING STATES
   ============================================================================= */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skeleton h-4 w-full", className)} />;
}

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      className={cn("loading-spinner", sizeClasses[size], className)}
      aria-label="Loading"
    />
  );
}

/* =============================================================================
   SECTION HEADER
   ============================================================================= */

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6",
        className
      )}
    >
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* =============================================================================
   ICONS (Simple inline SVGs)
   ============================================================================= */

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
