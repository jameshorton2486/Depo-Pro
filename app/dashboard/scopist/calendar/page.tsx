// =============================================================================
// SCOPIST CALENDAR
// app/dashboard/scopist/calendar/page.tsx
//
// Scopist calendar view (read-only, shows assigned jobs)
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { CalendarShell } from '@/components/calendar/calendar-shell';

export default async function ScopistCalendarPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string };

  if (user.role !== 'SCOPIST' && user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Calendar</h1>
      <CalendarShell 
        userRole={user.role as any}
      />
    </div>
  );
}
