import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { BookingRequestForm } from '@/components/calendar/booking-request-form';

export const metadata: Metadata = {
  title: 'Request Deposition | Depo-Pro',
  description: 'Submit a new deposition request',
};

export default async function NewBookingRequestPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Request a Deposition</h1>
        <p className="text-muted-foreground">
          Submit your scheduling request and the agency will respond within 24 hours.
        </p>
      </div>
      <BookingRequestForm />
    </div>
  );
}