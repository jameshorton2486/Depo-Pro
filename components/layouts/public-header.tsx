'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function PublicHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[var(--z-sticky)] transition-all duration-300 ${
        isScrolled
          ? 'bg-white shadow-[var(--shadow-soft)] border-b border-[var(--color-border)]'
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl lg:text-2xl font-bold text-[var(--color-primary)] hover:opacity-80 transition-opacity"
          >
            Depo-Pro
          </Link>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/features"
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-[var(--tracking-label)]"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-[var(--tracking-label)]"
            >
              Pricing
            </Link>
            <Link
              href="/security"
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-[var(--tracking-label)]"
            >
              Security
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-[var(--tracking-label)]"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-[var(--tracking-label)]"
            >
              Contact
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors hidden sm:inline-block"
            >
              Sign In
            </Link>
            <Button
              asChild
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white rounded-[var(--radius-button)]"
            >
              <Link href="/register">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
