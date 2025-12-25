import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { BookingRequestQueue } from '@/components/calendar/booking-request-queue';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Booking Requests | Depo-Pro',
  description: 'Manage deposition booking requests',
};

export default async function BookingRequestsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { firmId: true, role: true },
  });

  // Fetch reporters for agency to assign
  let reporters: Array<{ id: string; name: string }> = [];

  if (['AGENCY', 'ADMIN'].includes(session.user.role) && user?.firmId) {
    const reporterUsers = await db.user.findMany({
      where: {
        firmId: user.firmId,
        role: 'REPORTER',
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    reporters = reporterUsers.map(u => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
    }));
  }

  // Attorneys see different view than Agency
  const isAttorney = session.user.role === 'ATTORNEY';

  return (
    <div className="container mx-auto py-6">
      {isAttorney ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">My Booking Requests</h1>
              <p className="text-muted-foreground">
                Track your deposition requests and their status
              </p>
            </div>
            <Button asChild>
              <Link href="/calendar/requests/new">
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Link>
            </Button>
          </div>
          {/* Attorney sees simplified view - you could create a separate component */}
          <BookingRequestQueue reporters={[]} />
        </>
      ) : (
        <BookingRequestQueue reporters={reporters} />
      )}
    </div>
  );
}