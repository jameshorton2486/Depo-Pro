'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StartTranscriptionButtonProps {
  jobId: string;
  disabled?: boolean;
}

export function StartTranscriptionButton({ jobId, disabled }: StartTranscriptionButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'starting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function startTranscription() {
    setState('starting');
    setErrorMsg('');

    try {
      const res = await fetch(`/api/jobs/${jobId}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start transcription');
      }

      setState('done');
      router.refresh();
    } catch (err: unknown) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start transcription');
    }
  }

  if (state === 'done') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Transcription Started</p>
          <p className="text-xs text-emerald-600">
            Processing in progress. You can go to the review page to monitor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={startTranscription}
        disabled={disabled || state === 'starting'}
        className="bg-primary hover:bg-primary/90"
      >
        {state === 'starting' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Starting…
          </>
        ) : (
          <>
            <Mic className="mr-2 h-4 w-4" />
            Start Transcription
          </>
        )}
      </Button>
      {state === 'error' && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}
    </div>
  );
}
