'use client';

// ═══════════════════════════════════════════════════════════════
// WKT LAYOUT
// ═══════════════════════════════════════════════════════════════
// Separate layout for WKT (Written Knowledge Test) module
// WKT students have isolated access - no main app features

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Menu, X, LogOut } from 'lucide-react';
import { canAccessWKT } from '@/lib/auth/wkt-guard';

export default function WKTLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // Check if user has WKT access
      const role = session.user.user_metadata?.role || session.user.user_metadata?.user_role;
      if (!canAccessWKT(role)) {
        router.push('/dashboard');
        return;
      }

      setIsAuthenticated(true);
      setUserEmail(session.user.email || '');
    }

    checkAuth();
  }, [router]);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <Link href="/wkt" className="text-xl font-bold text-primary">
              WKT Prep
            </Link>

            {/* Center: Navigation (Desktop) */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/wkt"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/wkt/practice"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Practice
              </Link>
              <Link
                href="/wkt/mock-exam"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Mock Exam
              </Link>
              <Link
                href="/wkt/flashcards"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Flashcards
              </Link>
              <Link
                href="/wkt/progress"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Progress
              </Link>
            </nav>

            {/* Right: User Menu */}
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline text-sm text-muted-foreground">
                {userEmail}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav className="md:hidden pb-4 space-y-2">
              <Link
                href="/wkt"
                className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/wkt/practice"
                className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Practice
              </Link>
              <Link
                href="/wkt/mock-exam"
                className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Mock Exam
              </Link>
              <Link
                href="/wkt/flashcards"
                className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Flashcards
              </Link>
              <Link
                href="/wkt/progress"
                className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Progress
              </Link>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
