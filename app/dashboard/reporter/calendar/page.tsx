// =============================================================================
// REPORTER CALENDAR
// app/dashboard/reporter/calendar/page.tsx
//
// Reporter calendar view with jobs and availability
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { CalendarShell } from '@/components/calendar/calendar-shell';

export default async function ReporterCalendarPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string };

  if (user.role !== 'REPORTER' && user.role !== 'COURT_REPORTER' && user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Fetch calendar events and jobs
  const [_events, _jobs] = await Promise.all([
    db.calendarEvent.findMany({
      where: { createdById: user.id },
      orderBy: { startTime: 'asc' },
    }),
    db.job.findMany({
      where: { createdById: user.id },
      select: {
        id: true,
        caseName: true,
        title: true,
        depositionDate: true,
        status: true,
      },
    }),
  ]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Calendar</h1>
      <CalendarShell 
        userRole={user.role as any}
      />
    </div>
  );
}
