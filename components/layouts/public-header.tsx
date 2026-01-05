'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =============================================================================
// NAVIGATION CONFIGURATION
// =============================================================================

const NAV_ITEMS = [
  { label: 'Product', href: '/product' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'AI & Accuracy', href: '/ai' },
  { label: 'Security', href: '/security' },
  { label: 'Architecture', href: '/architecture' },
] as const;

// =============================================================================
// LOGO COMPONENT
// =============================================================================

function Logo({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      {/* Logo Mark */}
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-105",
        variant === 'light' 
          ? "bg-white text-indigo-900" 
          : "bg-indigo-600 text-white"
      )}>
        DP
      </div>
      {/* Logo Text */}
      <span className={cn(
        "text-xl font-bold tracking-tight transition-colors",
        variant === 'light' ? "text-white" : "text-slate-900"
      )}>
        Depo-Pro
      </span>
    </Link>
  );
}

// =============================================================================
// DESKTOP NAVIGATION
// =============================================================================

function DesktopNav({ 
  isScrolled, 
  pathname 
}: { 
  isScrolled: boolean; 
  pathname: string;
}) {
  return (
    <nav className="hidden lg:flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-2 text-[14px] font-medium rounded-lg transition-all duration-150",
              isScrolled ? (
                isActive 
                  ? "text-indigo-600 bg-indigo-50" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              ) : (
                isActive 
                  ? "text-white bg-white/15" 
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

// =============================================================================
// MOBILE NAVIGATION
// =============================================================================

function MobileNav({
  isOpen,
  onClose,
  pathname,
}: {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
}) {
  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div className="fixed inset-x-0 top-0 z-50 lg:hidden animate-fade-in-down">
        <div className="bg-white shadow-xl rounded-b-2xl mx-4 mt-4 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <Logo variant="dark" />
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-2">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors",
                    isActive
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* CTA Buttons */}
          <div className="p-4 pt-2 space-y-3 border-t border-slate-100">
            <Link
              href="/login"
              onClick={onClose}
              className="flex items-center justify-center w-full px-4 py-2.5 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <Button asChild className="w-full h-11 text-base font-semibold bg-indigo-600 hover:bg-indigo-700">
              <Link href="/register" onClick={onClose}>
                Request Access
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// MAIN HEADER COMPONENT
// =============================================================================

export function PublicHeader() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-soft border-b border-slate-200/50"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[72px]">
            {/* Logo */}
            <Logo variant={isScrolled ? 'dark' : 'light'} />

            {/* Desktop Navigation */}
            <DesktopNav isScrolled={isScrolled} pathname={pathname} />

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/login"
                className={cn(
                  "px-4 py-2 text-[14px] font-medium rounded-lg transition-all duration-150",
                  isScrolled
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                Sign In
              </Link>
              <Button
                asChild
                className={cn(
                  "h-10 px-5 text-[14px] font-semibold rounded-lg transition-all duration-150",
                  isScrolled
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md"
                    : "bg-white text-indigo-900 hover:bg-white/90 shadow-lg shadow-black/10"
                )}
              >
                <Link href="/register">Request Access</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className={cn(
                "lg:hidden p-2 rounded-lg transition-colors",
                isScrolled
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-white hover:bg-white/10"
              )}
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        pathname={pathname}
      />
    </>
  );
}

export default PublicHeader;
