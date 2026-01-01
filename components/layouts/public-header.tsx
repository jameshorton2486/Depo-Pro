'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PUBLIC_NAV_ITEMS } from '@/lib/navigation';

export function PublicHeader() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-200',
        isScrolled
          ? 'bg-white/95 backdrop-blur-sm shadow-soft border-b border-border'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className={cn(
              "text-xl font-bold transition-colors",
              isScrolled ? "text-indigo-900" : "text-white"
            )}>
              Depo-Pro
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {PUBLIC_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  pathname === item.href
                    ? isScrolled ? 'text-indigo-600' : 'text-white'
                    : isScrolled 
                      ? 'text-slate-600 hover:text-indigo-600' 
                      : 'text-white/80 hover:text-white'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className={cn(
                "text-sm font-medium transition-colors",
                isScrolled 
                  ? "text-slate-600 hover:text-indigo-600" 
                  : "text-white/80 hover:text-white"
              )}
            >
              Sign In
            </Link>
            <Button 
              asChild 
              className={cn(
                "font-medium",
                isScrolled 
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                  : "bg-white text-indigo-900 hover:bg-white/90"
              )}
            >
              <Link href="/register">Start Free Trial</Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className={cn("h-6 w-6", isScrolled ? "text-slate-900" : "text-white")} />
            ) : (
              <Menu className={cn("h-6 w-6", isScrolled ? "text-slate-900" : "text-white")} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-sm border-t border-slate-200 animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-4 space-y-3">
            {PUBLIC_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block py-2 text-base font-medium',
                  pathname === item.href ? 'text-indigo-600' : 'text-slate-600'
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <hr className="my-4 border-slate-200" />
            <Link
              href="/login"
              className="block py-2 text-base font-medium text-slate-600"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Sign In
            </Link>
            <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700">
              <Link href="/register">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
