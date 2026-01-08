// ═══════════════════════════════════════════════════════════════
// ATTORNEY APP LAYOUT
// ═══════════════════════════════════════════════════════════════
// Protected layout for Attorney-only routes
// SEPARATE from Depo-Pro reporter/scopist flows

import { getCurrentUser } from '@/lib/auth/session';
import { Role } from '@/lib/constants';
import { redirect } from 'next/navigation';
import { AttorneyNavbar } from '@/components/layouts/attorney-navbar';

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
  if (session.role !== Role.ATTORNEY && session.role !== Role.ADMIN) {
    redirect('/dashboard?error=unauthorized');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AttorneyNavbar user={{
        id: session.id,
        email: session.email,
        name: session.name || session.email,
        role: session.role,
      }} />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
