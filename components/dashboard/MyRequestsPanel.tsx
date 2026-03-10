'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RequestRow {
  id: string;
  job_title: string;
  cause_number: string | null;
  deposition_date: string | null;
  status: string;
  decline_reason: string | null;
  approved_job_id: string | null;
}

export function MyRequestsPanel() {
  const [requests, setRequests] = useState<RequestRow[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/intake/requests', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (active) {
          setRequests(data.requests ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setRequests([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>My Transcript Requests</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href="/requests">View All</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.length === 0 ? (
          <p className="text-sm text-slate-500">No requests submitted yet.</p>
        ) : requests.slice(0, 5).map((request) => (
          <div key={request.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">{request.job_title}</div>
                <div className="text-sm text-slate-500">
                  {request.cause_number || 'No cause number'} · {request.deposition_date || 'No date'}
                </div>
                {request.decline_reason && (
                  <div className="mt-2 text-sm text-red-600">{request.decline_reason}</div>
                )}
                {request.status === 'MODIFIED_AND_APPROVED' && (
                  <div className="mt-2 text-sm text-amber-700">Changes were made before approval.</div>
                )}
              </div>
              <Badge variant={request.status.includes('DECLINED') ? 'destructive' : request.status.includes('APPROVED') ? 'secondary' : 'outline'}>
                {request.status}
              </Badge>
            </div>
            {request.approved_job_id && (
              <div className="mt-3">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/jobs/${request.approved_job_id}`}>View Job</Link>
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
