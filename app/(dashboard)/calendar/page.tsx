import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { CalendarShell } from '@/components/calendar/CalendarShell';
import { Loader2 } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { cookies } from 'next/headers';

// ============================================
// CALENDAR PAGE METADATA
// ============================================

export const metadata = {
  title: 'Calendar | Depo-Pro',
  description: 'View and manage your deposition schedule',
};

// ============================================
// FETCH CALENDAR EVENTS (Server Component)
// ============================================

async function fetchCalendarEvents(startDate: Date, endDate: Date) {
  try {
    // For server components, we can use the API endpoint
    // In Next.js, we can use relative URLs for internal API routes
    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = new URL('/api/calendar', baseUrl);
    url.searchParams.set('startDate', startDate.toISOString());
    url.searchParams.set('endDate', endDate.toISOString());

    const cookieStore = await cookies();
    const cookieString = cookieStore.toString();

    const res = await fetch(url.toString(), {
      headers: {
        cookie: cookieString,
      },
      cache: 'no-store', // Always fetch fresh data
    });

    if (!res.ok) {
      console.error('Failed to fetch calendar events:', res.statusText);
      return { events: [] };
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return { events: [] };
  }
}

// ============================================
// CALENDAR PAGE
// ============================================

export default async function CalendarPage() {
  // Get session
  const session = await getCurrentUser();

  if (!session?.user) {
    redirect('/login');
  }

  // Type assertion for user with custom fields
  const user = session.user as {
    id: string;
    email: string;
    role: 'ADMIN' | 'REPORTER' | 'SCOPIST' | 'ATTORNEY' | 'AGENCY_ADMIN';
    firmId?: string;
    agencyId?: string;
  };

  // Scopists don't have calendar access in Phase 1
  if (user.role === 'SCOPIST') {
    redirect('/scopist/jobs');
  }

  // Fetch initial events for the current month (server-side)
  const now = new Date();
  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);
  
  const { events: apiEvents } = await fetchCalendarEvents(startDate, endDate);
  
  // Transform API events to CalendarEventUI format (convert date strings to Date objects)
  const initialEvents = (apiEvents || []).map((event: any) => ({
    ...event,
    start: event.start ? new Date(event.start) : new Date(),
    end: event.end ? new Date(event.end) : new Date(event.start ? new Date(event.start).getTime() + 2 * 60 * 60 * 1000 : Date.now()),
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Page Header */}
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Deposition Calendar</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and manage your scheduled depositions
        </p>
      </div>

      {/* Calendar Shell */}
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-sm text-gray-500">Loading calendar...</span>
            </div>
          </div>
        }
      >
        <CalendarShell
          userRole={user.role}
          userId={user.id}
          firmId={user.firmId}
          agencyId={user.agencyId}
          initialEvents={initialEvents || []}
        />
      </Suspense>
    </div>
  );
}
