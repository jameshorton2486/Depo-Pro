// =============================================================================
// AVAILABILITY EDITOR PAGE
// app/calendar/availability/page.tsx
//
// Week view with time slots for setting availability
// =============================================================================

'use client';

import { redirect } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AvailabilityEditor } from '@/components/calendar/availability-editor';
import { useEffect, useState } from 'react';

export default function AvailabilityPage() {
  const { user, profile, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoading || !mounted) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    redirect('/login');
    return null;
  }

  // Only reporters and scopists can set availability
  const userRole = profile?.role || 'REPORTER';
  if (userRole !== 'REPORTER' && userRole !== 'SCOPIST' && userRole !== 'ADMIN') {
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
