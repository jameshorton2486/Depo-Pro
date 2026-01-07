// ═══════════════════════════════════════════════════════════════
// APP NAVBAR COMPONENT
// ═══════════════════════════════════════════════════════════════
// Enhanced authenticated navbar with role-based navigation
// and active route highlighting

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import type { Session } from 'next-auth';
import { Menu, Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import {
  getNavigationItemsForRole,
  isPathActive,
  USER_MENU_ITEMS,
  ADMIN_MENU_ITEMS,
  ROLE_DISPLAY_NAMES,
  type UserRole,
} from '@/lib/navigation';

interface AppNavbarProps {
  user: Session['user'];
}

export function AppNavbar({ user }: AppNavbarProps) {
  const pathname = usePathname();
  const role = (user.role as UserRole) || 'REPORTER';
  const navItems = getNavigationItemsForRole(role);

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Logo + Nav Links */}
          <div className="flex items-center gap-8">
            <Link 
              href="/dashboard" 
              className="text-lg font-semibold text-brand-primary"
            >
              Depo-Pro
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isPathActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      active
                        ? 'text-brand-primary bg-brand-primary-soft'
                        : 'text-slate-600 hover:text-brand-primary hover:bg-slate-50'
                    )}
                  >
                    {item.label}
                    {active && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-brand-primary rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Notifications + User Menu */}
          <div className="flex items-center gap-2">
            {/* Notifications (placeholder) */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex h-9 w-9 text-slate-500 hover:text-brand-primary"
            >
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-9 w-9 rounded-full bg-brand-primary-soft text-brand-primary hover:bg-brand-primary hover:text-white"
                >
                  <span className="text-sm font-medium">
                    {getInitials(user.name || user.email)}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-slate-900">
                      {user.name || 'User'}
                    </p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                    <p className="text-xs text-brand-primary font-medium">
                      {ROLE_DISPLAY_NAMES[role]}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {USER_MENU_ITEMS.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="cursor-pointer">
                      {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}

                {(role === 'ADMIN' || role === 'AGENCY') && (
                  <>
                    <DropdownMenuSeparator />
                    {ADMIN_MENU_ITEMS.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className="cursor-pointer">
                          {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-9 w-9"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="text-left text-brand-primary">
                    Depo-Pro
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1">
                  {navItems.map((item) => {
                    const active = isPathActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors',
                          active
                            ? 'text-brand-primary bg-brand-primary-soft'
                            : 'text-slate-600 hover:text-brand-primary hover:bg-slate-50'
                        )}
                      >
                        {item.icon && <item.icon className="h-5 w-5" />}
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
