'use client';

import { useState } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeliverTranscriptButtonProps {
  jobId: string;
  transcriptId: string;
  orderingEmail: string;
  orderingName: string;
  depositionLabel: string;
}

export function DeliverTranscriptButton({
  jobId,
  transcriptId,
  orderingEmail,
  orderingName,
  depositionLabel,
}: DeliverTranscriptButtonProps) {
  const [state, setState] = useState<'idle' | 'confirming' | 'delivering' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function deliver() {
    setState('delivering');
    setErrorMsg('');

    try {
      const res = await fetch(`/api/jobs/${jobId}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptId, orderingEmail, orderingName }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Delivery failed');
      }

      setState('done');
    } catch (err: any) {
      setState('error');
      setErrorMsg(err.message);
    }
  }

  if (state === 'done') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Transcript Delivered</p>
          <p className="text-xs text-emerald-600">
            Download link sent to {orderingEmail}
          </p>
        </div>
      </div>
    );
  }

  if (state === 'confirming') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
        <p className="text-sm font-semibold text-amber-900">Confirm Delivery</p>
        <p className="text-sm text-amber-800">
          A secure 72-hour download link will be sent to:
          <br />
          <strong>{orderingName}</strong> — {orderingEmail}
          <br />
          <span className="text-xs">{depositionLabel}</span>
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={deliver} className="bg-emerald-600 hover:bg-emerald-700">
            <Send className="mr-2 h-4 w-4" />
            Send Transcript
          </Button>
          <Button size="sm" variant="outline" onClick={() => setState('idle')}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {state === 'error' && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700">{errorMsg}</p>
        </div>
      )}
      <Button
        onClick={() => setState('confirming')}
        disabled={state === 'delivering'}
        className="w-full"
      >
        {state === 'delivering' ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Delivering...</>
        ) : (
          <><Send className="mr-2 h-4 w-4" />Deliver Transcript</>
        )}
      </Button>
    </div>
  );
}
