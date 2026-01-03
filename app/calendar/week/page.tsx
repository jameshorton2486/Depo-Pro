// =============================================================================
// CALENDAR WEEK VIEW
// app/calendar/week/page.tsx
//
// Week view calendar with jobs and events
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { CalendarShell } from '@/components/calendar/calendar-shell';

export default async function CalendarWeekPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Calendar - Week View</h1>
      <CalendarShell 
        userRole={user.role as any}
      />
    </div>
  );
}
