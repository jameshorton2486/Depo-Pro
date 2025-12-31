// ═══════════════════════════════════════════════════════════════
// NAVBAR COMPONENT
// ═══════════════════════════════════════════════════════════════
// Main navigation bar for authenticated users

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Role } from '@/lib/constants';
import { Session } from 'next-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils';

interface NavbarProps {
  user: Session['user'];
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <nav className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-xl font-bold text-[var(--color-primary)]">
            Depo-Pro
          </Link>

          {/* Main Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                isActive('/dashboard') ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/jobs"
              className={`text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                isActive('/jobs') ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Jobs
            </Link>
            <Link
              href="/calendar"
              className={`text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                isActive('/calendar') ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Calendar
            </Link>
            {user.role === Role.REPORTER && (
              <Link
                href="/calendar/availability"
                className={`text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                  isActive('/calendar/availability') ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                My Availability
              </Link>
            )}
            {user.role === Role.ATTORNEY && (
              <>
                <Link
                  href="/attorney"
                  className={`text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                    isActive('/attorney') ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/attorney/transcripts"
                  className={`text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                    isActive('/attorney/transcripts') ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  Transcripts
                </Link>
                <Link
                  href="/attorney/cases"
                  className={`text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                    isActive('/attorney/cases') ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  Cases
                </Link>
                <Link
                  href="/calendar"
                  className={`text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                    isActive('/calendar') ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  Calendar
                </Link>
              </>
            )}
            {(user.role === Role.AGENCY || user.role === Role.ADMIN) && (
              <Link
                href="/calendar/requests"
                className={`text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                  isActive('/calendar/requests') ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                Booking Requests
              </Link>
            )}
            {user.role === 'ADMIN' && (
              <Link
                href="/admin"
                className={`text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                  isActive('/admin') ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                Admin
              </Link>
            )}
          </div>
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-bg)] text-[var(--color-primary)] text-sm font-medium">
                {getInitials(user.name || user.email)}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <p className="text-sm font-medium text-[var(--color-primary)]">{user.name || 'User'}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile">Profile Settings</Link>
            </DropdownMenuItem>
            {/* Firm Settings removed for MVP
            {user.role === Role.ADMIN && (
              <DropdownMenuItem asChild>
                <Link href="/settings/firm">Firm Settings</Link>
              </DropdownMenuItem>
            )}
            */}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 cursor-pointer"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
