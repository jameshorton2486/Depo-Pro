// =============================================================================
// CALENDAR MONTH VIEW
// app/calendar/month/page.tsx
//
// Month view calendar with jobs and events
// =============================================================================

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { CalendarShell } from '@/components/calendar/calendar-shell';

export const dynamic = 'force-dynamic';

export default async function CalendarMonthPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>
      <CalendarShell
        userRole={currentUser.role as any}
      />
    </div>
  );
}
