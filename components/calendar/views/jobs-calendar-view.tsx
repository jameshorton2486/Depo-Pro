'use client';

// =============================================================================
// JOBS CALENDAR VIEW
// components/calendar/views/jobs-calendar-view.tsx
//
// Phase 3A-1: Jobs calendar view - shows jobs with assignments
// =============================================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface Job {
  id: string;
  title: string;
  caseName: string;
  depositionDate: Date | null;
  status: string;
}

export function JobsCalendarView() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
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
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Jobs Calendar
        </h2>
        <p className="text-sm text-muted-foreground">
          All jobs with their scheduled dates
        </p>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No jobs found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="hover:underline"
                      >
                        {job.title || job.caseName}
                      </Link>
                    </CardTitle>
                    {job.caseName && job.title !== job.caseName && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {job.caseName}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">{job.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {job.depositionDate && (
                  <div className="text-sm text-muted-foreground">
                    <p>Date: {format(new Date(job.depositionDate), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
