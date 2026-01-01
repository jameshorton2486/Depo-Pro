// ═══════════════════════════════════════════════════════════════
// DASHBOARD LAYOUT
// ═══════════════════════════════════════════════════════════════
// Protected layout for all dashboard routes

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layouts/navbar';
import { CommandPalette } from '@/components/command';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar user={session.user} />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <CommandPalette />
    </div>
  );
}
