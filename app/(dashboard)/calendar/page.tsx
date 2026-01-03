// =============================================================================
// CALENDAR PAGE
// app/(dashboard)/calendar/page.tsx
//
// Phase 3A-1: Clean page entry - no logic, just render shell
// Auth gate handled by middleware
// =============================================================================

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { CalendarShell } from '@/components/calendar/calendar-shell';

export const metadata = {
  title: 'Calendar | Depo-Pro',
  description: 'View and manage your deposition schedule',
};

export default async function CalendarPage() {
  const session = await getCurrentUser();

  if (!session?.user) {
    redirect('/login');
  }

  return <CalendarShell userRole={session.user.role} />;
}
