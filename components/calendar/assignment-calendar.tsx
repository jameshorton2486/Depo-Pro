'use client';

// =============================================================================
// ASSIGNMENT CALENDAR
// components/calendar/assignment-calendar.tsx
//
// Phase 3A-3: Clear assignment visualization with color-coded states
// =============================================================================

import { useEffect, useState } from 'react';
import { AssignmentBadge } from '@/components/ui/assignment-badge';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

type AssignmentStatusUI = 'assigned' | 'pending' | 'conflict' | 'available';

interface Assignment {
  id: string;
  jobId: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
  status: AssignmentStatusUI;
  assignedReporterName?: string;
  assignedScopistName?: string;
}

export function AssignmentCalendar() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      
      // Fetch jobs with assignments
      const response = await fetch('/api/jobs');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      const jobs = data.jobs || data.data || [];
      
      // Transform jobs to assignments
      const assignments: Assignment[] = jobs
        .filter((job: any) => job.depositionDate) // Only jobs with dates
        .map((job: any) => {
          // Determine status (UI status, not Prisma enum)
          let status: 'assigned' | 'pending' | 'conflict' | 'available' = 'available';
          if (job.assignments && job.assignments.length > 0) {
            status = 'assigned';
          } else if (job.status === 'ASSIGNED' || job.status === 'IN_EDIT') {
            status = 'pending';
          }
          
          // Check for conflicts (simplified - would need actual conflict detection)
          if (job.status === 'CANCELLED') {
            status = 'conflict';
          }
          
          return {
            id: job.id,
            jobId: job.id,
            title: job.title || job.caseName || 'Untitled Job',
            start: job.depositionDate ? new Date(job.depositionDate).toISOString() : new Date().toISOString(),
            end: job.depositionDate 
              ? new Date(new Date(job.depositionDate).getTime() + 4 * 60 * 60 * 1000).toISOString() // Default 4 hours
              : new Date().toISOString(),
            status: status as 'assigned' | 'pending' | 'conflict' | 'available',
            assignedReporterName: job.createdBy 
              ? `${job.createdBy.firstName} ${job.createdBy.lastName}`
              : undefined,
            assignedScopistName: job.assignments?.[0]?.scopist
              ? `${job.assignments[0].scopist.firstName} ${job.assignments[0].scopist.lastName}`
              : undefined,
          };
        });
      
      setItems(assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">Assignments</h2>
        <p className="text-sm text-muted-foreground">
          Jobs and events assigned to you
        </p>
      </div>

      <div className="grid gap-2">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No assignments found
          </div>
        ) : (
          items.map((job) => (
            <div
              key={job.id}
              className={`p-3 rounded-md border transition-colors hover:shadow-sm ${
                job.status === 'conflict'
                  ? 'border-red-500 bg-red-50'
                  : job.status === 'assigned'
                  ? 'border-green-500 bg-green-50'
                  : job.status === 'pending'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium mb-1">
                    <Link
                      href={`/jobs/${job.jobId}`}
                      className="hover:underline"
                    >
                      {job.title}
                    </Link>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(job.start), 'MMM d, yyyy h:mm a')} –{' '}
                    {format(new Date(job.end), 'h:mm a')}
                  </div>
                  {job.assignedReporterName && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Reporter: {job.assignedReporterName}
                    </div>
                  )}
                  {job.assignedScopistName && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Scopist: {job.assignedScopistName}
                    </div>
                  )}
                </div>
                <AssignmentBadge
                  status={job.status === 'conflict' ? 'overbooked' : job.status}
                  assigneeName={
                    job.status === 'assigned'
                      ? job.assignedScopistName || job.assignedReporterName
                      : undefined
                  }
                  size="sm"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
