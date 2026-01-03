// =============================================================================
// ADMIN CALENDAR
// app/dashboard/admin/calendar/page.tsx
//
// Admin calendar view (all events and jobs)
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { CalendarShell } from '@/components/calendar/calendar-shell';

export default async function AdminCalendarPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string };

  if (user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">System Calendar</h1>
      <CalendarShell 
        userRole={user.role as any}
      />
    </div>
  );
}
