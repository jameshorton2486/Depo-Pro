'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

type LiveStatus = 'inactive' | 'connecting' | 'listening' | 'error' | 'stopped';

interface LiveTranscriptControlsProps {
  transcriptId: string;
  onSessionStarted?: (sessionId: string) => void;
  onSessionStopped?: () => void;
  onWord?: (word: any) => void;
}

export function LiveTranscriptControls({
  transcriptId,
  onSessionStarted,
  onSessionStopped,
  onWord: _onWord,
}: LiveTranscriptControlsProps) {
  const [status, setStatus] = useState<LiveStatus>('inactive');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendChunk = useCallback(async (chunk: Blob, sid: string) => {
    try {
      const arrayBuffer = await chunk.arrayBuffer();
      await fetch('/api/transcribe/live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Session-Id': sid,
        },
        body: arrayBuffer,
      });
    } catch {
      // Chunk send failures are non-fatal; the 30s DB flush handles persistence
    }
  }, []);

  const handleStart = useCallback(async () => {
    setStatus('connecting');
    setError(null);

    try {
      // 1. Start server session
      const res = await fetch('/api/transcribe/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', transcriptId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start session');
      }

      const { sessionId: sid } = await res.json();
      setSessionId(sid);
      onSessionStarted?.(sid);

      // 2. Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // 3. Start MediaRecorder with 250ms chunks
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          sendChunk(event.data, sid);
        }
      };

      mediaRecorder.onerror = () => {
        setStatus('error');
        setError('MediaRecorder error');
      };

      mediaRecorder.start(250); // 250ms chunks
      setStatus('listening');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to start');
    }
  }, [transcriptId, onSessionStarted, sendChunk]);

  const handleStop = useCallback(async () => {
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Stop media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear any interval
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }

    // Stop server session
    if (sessionId) {
      try {
        await fetch(`/api/transcribe/live?sessionId=${sessionId}`, {
          method: 'DELETE',
        });
      } catch {
        // Best-effort cleanup
      }
    }

    setStatus('stopped');
    setSessionId(null);
    onSessionStopped?.();
  }, [sessionId, onSessionStopped]);

  const statusColor: Record<LiveStatus, string> = {
    inactive: 'bg-gray-500',
    connecting: 'bg-yellow-500 animate-pulse',
    listening: 'bg-red-500 animate-pulse',
    error: 'bg-red-700',
    stopped: 'bg-gray-500',
  };

  const statusLabel: Record<LiveStatus, string> = {
    inactive: 'Ready',
    connecting: 'Connecting...',
    listening: 'Recording',
    error: 'Error',
    stopped: 'Stopped',
  };

  return (
    <div className="flex items-center gap-3">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <div className={cn('h-3 w-3 rounded-full', statusColor[status])} />
        <span className="text-sm text-muted-foreground">{statusLabel[status]}</span>
      </div>

      {/* Controls */}
      {status === 'inactive' || status === 'stopped' || status === 'error' ? (
        <button
          onClick={handleStart}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Start Live Transcription
        </button>
      ) : status === 'listening' ? (
        <button
          onClick={handleStop}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Stop
        </button>
      ) : null}

      {/* Save & Review button after stopping */}
      {status === 'stopped' && (
        <a
          href={`/jobs/${transcriptId}/review`}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
        >
          Save & Review
        </a>
      )}

      {/* Error display */}
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  );
}
