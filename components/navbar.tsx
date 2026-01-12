"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-provider";

/* =============================================================================
   PUBLIC NAVBAR
   Used on marketing pages: /, /features, /pricing, /security, /contact, /login
   ============================================================================= */

const publicNavLinks = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/contact", label: "Contact" },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "navbar",
        scrolled && "shadow-sm"
      )}
    >
      <div className="page-container">
        <nav className="navbar-content">
          {/* Logo */}
          <Link href="/" className="navbar-logo">
            <DepoProLogo className="h-8 w-auto" />
            <span>Depo-Pro</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex navbar-links">
            {publicNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "navbar-link",
                  pathname === link.href && "navbar-link-active"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="navbar-link hidden sm:inline-flex"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium
                         bg-primary text-primary-foreground rounded-lg
                         hover:bg-primary/90 transition-colors"
            >
              Start Free Trial
            </Link>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-muted"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <XIcon className="w-5 h-5" />
              ) : (
                <MenuIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-slide-down">
            <div className="flex flex-col gap-2">
              {publicNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/login"
                className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* =============================================================================
   AUTHENTICATED NAVBAR (APP NAVBAR)
   Used in dashboard after login
   ============================================================================= */

type UserRole = "ADMIN" | "COURT_REPORTER" | "SCOPIST" | "ATTORNEY";

interface User {
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AppNavbarProps {
  user: User;
}

// Role-specific navigation links
const roleNavLinks: Record<UserRole, Array<{ href: string; label: string; icon: React.ReactNode }>> = {
  COURT_REPORTER: [
    { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon className="w-4 h-4" /> },
    { href: "/calendar", label: "Calendar", icon: <CalendarIcon className="w-4 h-4" /> },
    { href: "/jobs", label: "Jobs", icon: <FileIcon className="w-4 h-4" /> },
    { href: "/transcripts", label: "Transcripts", icon: <TranscriptIcon className="w-4 h-4" /> },
  ],
  SCOPIST: [
    { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon className="w-4 h-4" /> },
    { href: "/assignments", label: "Assignments", icon: <FileIcon className="w-4 h-4" /> },
    { href: "/review", label: "Review Queue", icon: <TranscriptIcon className="w-4 h-4" /> },
  ],
  ADMIN: [
    { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon className="w-4 h-4" /> },
    { href: "/jobs", label: "All Jobs", icon: <FileIcon className="w-4 h-4" /> },
    { href: "/users", label: "Users", icon: <UsersIcon className="w-4 h-4" /> },
    { href: "/billing", label: "Billing", icon: <BillingIcon className="w-4 h-4" /> },
    { href: "/audit", label: "Audit Logs", icon: <AuditIcon className="w-4 h-4" /> },
  ],
  ATTORNEY: [
    { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon className="w-4 h-4" /> },
    { href: "/cases", label: "Cases", icon: <FileIcon className="w-4 h-4" /> },
    { href: "/transcripts", label: "Transcripts", icon: <TranscriptIcon className="w-4 h-4" /> },
  ],
};

export function AppNavbar({ user }: AppNavbarProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const navLinks = roleNavLinks[user.role] || roleNavLinks.COURT_REPORTER;

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuOpen && !(e.target as Element).closest("[data-user-menu]")) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [userMenuOpen]);

  return (
    <header
      className={cn(
        "navbar",
        scrolled && "shadow-sm"
      )}
    >
      <div className="page-container">
        <nav className="navbar-content">
          {/* Logo */}
          <Link href="/dashboard" className="navbar-logo">
            <DepoProLogo className="h-8 w-auto" />
            <span className="hidden sm:inline">Depo-Pro</span>
          </Link>

          {/* Main Navigation */}
          <div className="hidden md:flex navbar-links">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "navbar-link flex items-center gap-2",
                  pathname === link.href && "navbar-link-active"
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Notifications"
            >
              <BellIcon className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <ThemeToggle />

            {/* User Menu */}
            <div className="relative" data-user-menu>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <ChevronIcon
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform hidden sm:block",
                    userMenuOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg py-2 z-dropdown animate-scale-in">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <span className="inline-block mt-1">
                      <RoleBadge role={user.role} />
                    </span>
                  </div>
                  <div className="py-1">
                    <MenuLink href="/settings/profile" icon={<UserIcon className="w-4 h-4" />}>
                      Profile
                    </MenuLink>
                    <MenuLink href="/settings" icon={<SettingsIcon className="w-4 h-4" />}>
                      Settings
                    </MenuLink>
                    {user.role === "ADMIN" && (
                      <MenuLink href="/settings/organization" icon={<BuildingIcon className="w-4 h-4" />}>
                        Organization
                      </MenuLink>
                    )}
                    <MenuLink href="/settings/billing" icon={<BillingIcon className="w-4 h-4" />}>
                      Billing
                    </MenuLink>
                  </div>
                  <div className="border-t border-border pt-1">
                    <button
                      onClick={async () => {
                        // Handle logout via Supabase
                        const { getSupabaseBrowserClient } = await import('@/lib/supabase/browser');
                        const supabase = getSupabaseBrowserClient();
                        await supabase.auth.signOut();
                        window.location.href = '/login';
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogoutIcon className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}

/* =============================================================================
   HELPER COMPONENTS
   ============================================================================= */

function MenuLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const config: Record<UserRole, { label: string; className: string }> = {
    ADMIN: { label: "Admin", className: "badge-admin" },
    COURT_REPORTER: { label: "Reporter", className: "badge-reporter" },
    SCOPIST: { label: "Scopist", className: "badge-scopist" },
    ATTORNEY: { label: "Attorney", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  };

  const { label, className } = config[role];

  return (
    <span className={cn("badge-depo text-2xs", className)}>{label}</span>
  );
}

/* =============================================================================
   ICON COMPONENTS
   ============================================================================= */

function DepoProLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <rect width="32" height="32" rx="8" fill="currentColor" className="text-primary" />
      <path
        d="M8 10h4v12H8V10zm6 0h6a4 4 0 014 4v4a4 4 0 01-4 4h-6V10zm4 8h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2v4z"
        fill="white"
      />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function TranscriptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function BillingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function AuditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
