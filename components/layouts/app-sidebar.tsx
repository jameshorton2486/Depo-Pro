// ═══════════════════════════════════════════════════════════════════════════════
// ROLE-AWARE SIDEBAR COMPONENT
// components/layouts/app-sidebar.tsx
//
// Layer 3: Role-aware navigation renderer
// Consumes navigation schema, renders appropriate nav for user's role
// ═══════════════════════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import {
  type NavSection,
  type NavItem,
  type UserRole,
  getNavigationForRole,
} from '@/lib/navigation';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface AppSidebarProps {
  userRole: UserRole;
  userName?: string | null;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR NAV ITEM
// ═══════════════════════════════════════════════════════════════════════════════

function SidebarNavItem({
  item,
  collapsed,
  isActive,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  const Icon = item.icon;

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {Icon && <Icon className="h-5 w-5" />}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col gap-1">
            <span className="font-medium">{item.label}</span>
            {item.description && (
              <span className="text-xs text-muted-foreground">{item.description}</span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="truncate">{item.label}</span>
      {item.badge && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function SidebarSection({
  section,
  collapsed,
  pathname,
}: {
  section: NavSection;
  collapsed: boolean;
  pathname: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const SectionIcon = section.icon;

  // Check if any item in this section is active
  const hasActiveItem = section.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  // Auto-expand section if it contains active item
  useEffect(() => {
    if (hasActiveItem && !isExpanded) {
      setIsExpanded(true);
    }
  }, [hasActiveItem]);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 py-2">
        {section.items.map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            collapsed={collapsed}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="py-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider',
          hasActiveItem ? 'text-primary' : 'text-muted-foreground',
          'hover:text-foreground transition-colors'
        )}
      >
        {SectionIcon && <SectionIcon className="h-4 w-4" />}
        <span className="flex-1 text-left">{section.section}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform',
            !isExpanded && '-rotate-90'
          )}
        />
      </button>
      {isExpanded && (
        <div className="mt-1 space-y-1 px-2">
          {section.items.map((item) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SIDEBAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AppSidebar({
  userRole,
  userName,
  collapsed: controlledCollapsed,
  onCollapsedChange,
}: AppSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [requestCount, setRequestCount] = useState<number | null>(null);
  const pathname = usePathname();

  // Support both controlled and uncontrolled modes
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = onCollapsedChange ?? setInternalCollapsed;

  // Get navigation schema for user's role
  const baseNavigation = getNavigationForRole(userRole);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!(userRole === 'ADMIN' || userRole === 'ATTORNEY' || userRole === 'PARALEGAL' || userRole === 'LAW_FIRM' || userRole === 'AGENCY')) {
      setRequestCount(null);
      return;
    }

    let active = true;
    fetch('/api/intake/requests?status=PENDING_REVIEW&count=true', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (active) {
          setRequestCount(typeof data.count === 'number' ? data.count : null);
        }
      })
      .catch(() => {
        if (active) {
          setRequestCount(null);
        }
      });

    return () => {
      active = false;
    };
  }, [userRole]);

  const navigation = baseNavigation.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if ((userRole === 'ADMIN' && item.href === '/admin/requests') || (userRole !== 'ADMIN' && item.href === '/requests')) {
        return { ...item, badge: requestCount ?? item.badge };
      }
      return item;
    }),
  }));

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div
            className={cn(
              'flex h-16 items-center border-b px-4',
              collapsed ? 'justify-center' : 'justify-between'
            )}
          >
            {!collapsed && (
              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">Depo-Pro</span>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-2">
            <nav className="space-y-1">
              {navigation.map((section, index) => (
                <div key={section.section}>
                  {index > 0 && <Separator className="my-2" />}
                  <SidebarSection
                    section={section}
                    collapsed={collapsed}
                    pathname={pathname}
                  />
                </div>
              ))}
            </nav>
          </ScrollArea>

          {/* Footer */}
          {!collapsed && userName && (
            <div className="border-t p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 truncate">
                  <p className="text-sm font-medium truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {userRole.toLowerCase().replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR LAYOUT WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

interface SidebarLayoutProps {
  children: React.ReactNode;
  userRole: UserRole;
  userName?: string | null;
}

export function SidebarLayout({ children, userRole, userName }: SidebarLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        userRole={userRole}
        userName={userName}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          collapsed ? 'md:ml-16' : 'md:ml-64'
        )}
      >
        {children}
      </main>
    </div>
  );
}

export default AppSidebar;
