// =============================================================================
// AVAILABILITY EDITOR PAGE
// app/calendar/availability/page.tsx
//
// Week view with time slots for setting availability
// =============================================================================

'use client';

import { redirect } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AvailabilityEditor } from '@/components/calendar/availability-editor';
import { useEffect, useState } from 'react';

export default function AvailabilityPage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (status === 'loading' || !mounted) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    redirect('/login');
    return null;
  }

  const user = session.user as { id: string; role: string };

  // Only reporters and scopists can set availability
  if (user.role !== 'REPORTER' && user.role !== 'SCOPIST' && user.role !== 'ADMIN' && user.role !== 'COURT_REPORTER') {
    redirect('/dashboard');
    return null;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Set Your Availability</h1>
      <p className="text-gray-600 mb-4">
        Drag to select times when you're available for assignments.
      </p>
      <AvailabilityEditor />
    </div>
  );
}
