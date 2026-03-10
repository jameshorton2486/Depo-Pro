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
  start_time: string | null;
  location: string | null;
  status: string;
  submitted_by_role: string;
  ordering_attorney: string | null;
  ordering_firm: string | null;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);

  useEffect(() => {
    fetch('/api/intake/requests?status=PENDING_REVIEW', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setRequests(data.requests ?? []))
      .catch(() => setRequests([]));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Transcript Requests</h1>
        <p className="mt-1 text-sm text-slate-500">Pending review queue for submitted transcript requests.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Review ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="font-semibold text-slate-900">{request.job_title}</div>
                  <div className="text-sm text-slate-600">
                    {request.cause_number || 'No cause number'} · {request.deposition_date || 'No date'} {request.start_time ? `@ ${request.start_time}` : ''} · {request.location || 'Location TBD'}
                  </div>
                  <div className="text-sm text-slate-500">
                    Submitted by {request.submitted_by_role} · {request.ordering_attorney || 'Unknown ordering attorney'} {request.ordering_firm ? `· ${request.ordering_firm}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{request.status}</Badge>
                  <Button asChild>
                    <Link href={`/admin/requests/${request.id}`}>Review</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {requests.length === 0 && <p className="text-sm text-slate-500">No pending requests.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
