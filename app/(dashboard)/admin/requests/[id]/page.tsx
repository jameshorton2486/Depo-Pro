'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface RequestDetail {
  id: string;
  deposition_date: string | null;
  start_time: string | null;
  location: string | null;
  audio_processing: 'automated' | 'forensic';
}

export default function AdminRequestReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updates, setUpdates] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/intake/requests', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        const row = (data.requests ?? []).find((item: RequestDetail) => item.id === params.id) ?? null;
        setRequest(row);
      })
      .catch(() => setRequest(null));
  }, [params.id]);

  async function review(action: 'APPROVE' | 'MODIFY_AND_APPROVE' | 'DECLINE') {
    const response = await fetch(`/api/intake/requests/${params.id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        declineReason,
        adminNotes,
        updates: {
          depositionDate: updates.deposition_date,
          startTime: updates.start_time,
          audioProcessing: updates.audio_processing,
          location: updates.location,
        },
      }),
    });

    if (response.ok) {
      router.push('/admin/requests');
      router.refresh();
    }
  }

  if (!request) {
    return <div className="p-6 text-sm text-slate-500">Loading request...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Deposition Date</Label>
              <Input defaultValue={request.deposition_date ?? ''} onChange={(event) => setUpdates((current) => ({ ...current, deposition_date: event.target.value }))} />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input defaultValue={request.start_time ?? ''} onChange={(event) => setUpdates((current) => ({ ...current, start_time: event.target.value }))} />
            </div>
            <div>
              <Label>Audio Processing</Label>
              <Input defaultValue={request.audio_processing} onChange={(event) => setUpdates((current) => ({ ...current, audio_processing: event.target.value }))} />
            </div>
            <div>
              <Label>Location</Label>
              <Input defaultValue={request.location ?? ''} onChange={(event) => setUpdates((current) => ({ ...current, location: event.target.value }))} />
            </div>
          </div>

          <div>
            <Label>Admin Notes</Label>
            <Textarea value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} />
          </div>

          <div>
            <Label>Decline Reason</Label>
            <Textarea value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} />
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="destructive" onClick={() => review('DECLINE')}>Decline</Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => review('MODIFY_AND_APPROVE')}>Modify & Approve</Button>
              <Button onClick={() => review('APPROVE')}>Approve</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
