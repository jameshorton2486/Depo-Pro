// ═══════════════════════════════════════════════════════════════
// ATTORNEY NAVBAR
// ═══════════════════════════════════════════════════════════════
// Separate navigation for Attorney app (isolated from Depo-Pro)

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FileText, Flag, BarChart3, Settings, LogOut, FolderOpen } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { CommandTrigger } from '@/components/command';

interface AttorneyNavbarProps {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export function AttorneyNavbar({ user }: AttorneyNavbarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/attorney/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/attorney/transcripts', label: 'Transcripts', icon: FileText },
    { href: '/attorney/exhibits', label: 'Exhibits', icon: FolderOpen },
    { href: '/attorney/issues', label: 'Issues', icon: Flag },
    { href: '/attorney/reports', label: 'Reports', icon: BarChart3 },
    { href: '/attorney/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-4">
            <Link href="/attorney/dashboard" className="text-xl font-bold text-gray-900">
              Depo-Pro <span className="text-blue-600">Attorney</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? 'default' : 'ghost'}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Right: Command Palette + User Menu */}
          <div className="flex items-center gap-4">
            <CommandTrigger className="hidden md:flex" />
            <span className="text-sm text-gray-600">{user.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

