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
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type User = Database['public']['Tables']['users']['Row'];

export default function AvailabilityPage() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    async function fetchProfile() {
      if (!user) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setProfileLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  if (loading || !mounted || profileLoading) {
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
  const userRole = profile?.role ?? null;
  if (!userRole) {
    redirect('/unauthorized');
    return null;
  }
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
