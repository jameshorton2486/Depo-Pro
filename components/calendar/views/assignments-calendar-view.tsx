'use client';

// =============================================================================
// ASSIGNMENTS CALENDAR VIEW
// components/calendar/views/assignments-calendar-view.tsx
//
// Phase 3A-1: Assignments overview - shows jobs assigned to user
// =============================================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface Assignment {
  id: string;
  jobId: string;
  jobTitle: string;
  caseName: string;
  startDate: Date;
  status: string;
  scopistName?: string;
}

export function AssignmentsCalendarView() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const response = await fetch('/api/jobs?assigned=me');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setAssignments(data.jobs || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">My Assignments</h2>
        <p className="text-sm text-muted-foreground">
          Jobs and events assigned to you
        </p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No assignments found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      <Link
                        href={`/jobs/${assignment.jobId}`}
                        className="hover:underline"
                      >
                        {assignment.jobTitle || assignment.caseName}
                      </Link>
                    </CardTitle>
                    {assignment.caseName && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {assignment.caseName}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">{assignment.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {assignment.startDate && (
                    <p>Date: {format(new Date(assignment.startDate), 'MMM d, yyyy')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
