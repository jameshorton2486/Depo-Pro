import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AvailabilityManager } from '@/components/calendar/availability-manager';

export const metadata: Metadata = {
  title: 'My Availability | Depo-Pro',
  description: 'Manage your availability schedule',
};

export default async function AvailabilityPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Only reporters should access this page
  if (session.user.role !== 'REPORTER') {
    redirect('/calendar');
  }

  return (
    <div className="container mx-auto py-6">
      <AvailabilityManager />
    </div>
  );
}