import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { DepoCalendar } from '@/components/calendar/depo-calendar';

export const metadata: Metadata = {
  title: 'Calendar | Depo-Pro',
  description: 'Manage your deposition schedule',
};

export default async function CalendarPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  // Fetch reporters for filter dropdown (Agency/Admin only)
  let reporters: Array<{ id: string; name: string }> = [];
  
  if (['AGENCY', 'ADMIN'].includes(session.user.role)) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { firmId: true },
    });

    if (user?.firmId) {
      const reporterUsers = await db.user.findMany({
        where: {
          firmId: user.firmId,
          role: 'REPORTER',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });

      reporters = reporterUsers.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
      }));
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground">
          {session.user.role === 'REPORTER' 
            ? 'View your assigned depositions'
            : session.user.role === 'ATTORNEY'
            ? 'View your requested depositions'
            : 'Manage deposition scheduling'}
        </p>
      </div>
      
      <DepoCalendar 
        reporters={reporters}
        initialView="dayGridMonth"
      />
    </div>
  );
}

