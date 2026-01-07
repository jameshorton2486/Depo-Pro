// ═══════════════════════════════════════════════════════════════
// ATTORNEY APP LAYOUT
// ═══════════════════════════════════════════════════════════════
// Protected layout for Attorney-only routes
// SEPARATE from Depo-Pro reporter/scopist flows

import { getCurrentUser } from '@/lib/auth';
import { Role } from '@/lib/constants';
import { redirect } from 'next/navigation';
import { AttorneyNavbar } from '@/components/layouts/attorney-navbar';
import type { Session } from 'next-auth';

export default async function AttorneyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();

  if (!session) {
    redirect('/login');
  }

  // Enforce ATTORNEY role (admins can also access)
  if (session.user.role !== Role.ATTORNEY && session.user.role !== Role.ADMIN) {
    redirect('/dashboard?error=unauthorized');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AttorneyNavbar user={session.user as Session['user']} />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

