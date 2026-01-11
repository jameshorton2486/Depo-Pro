// =============================================================================
// CALENDAR MONTH VIEW
// app/calendar/month/page.tsx
//
// Month view calendar with jobs and events
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { CalendarShell } from '@/components/calendar/calendar-shell';

export const dynamic = 'force-dynamic';

export default async function CalendarMonthPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>
      <CalendarShell
        userRole={user.role as any}
      />
    </div>
  );
}
