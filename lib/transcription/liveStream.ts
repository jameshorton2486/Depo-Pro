// lib/transcription/liveStream.ts
// Manages a Deepgram live streaming connection for real-time transcription.

import { createClient as createDeepgramClient } from '@deepgram/sdk';
import type { ListenLiveClient } from '@deepgram/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface ParsedWord {
  word: string;
  punctuated_word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: number;
  is_final: boolean;
}

export interface LiveSession {
  send(audioChunk: Buffer): void;
  close(): Promise<void>;
}

const BATCH_INTERVAL_MS = 30_000; // Auto-save every 30 seconds

export function createLiveSession(
  sessionId: string,
  transcriptId: string,
  onWord: (word: ParsedWord) => void,
  onError: (error: Error) => void,
): LiveSession {
  const apiKey = requireEnv('DEEPGRAM_API_KEY');
  const deepgram = createDeepgramClient(apiKey);

  let connection: ListenLiveClient | null = null;
  let wordBuffer: ParsedWord[] = [];
  let batchTimer: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const flushWords = async () => {
    if (wordBuffer.length === 0) return;
    const batch = [...wordBuffer];
    wordBuffer = [];

    try {
      const supabase = createAdminClient();
      // Append words to the transcription's words JSONB array
      const { data: transcript } = await supabase
        .from('transcriptions')
        .select('words')
        .eq('id', transcriptId)
        .single();

      const existing = Array.isArray(transcript?.words) ? transcript.words : [];
      const merged = [
        ...existing,
        ...batch.map((w) => ({
          word: w.word,
          punctuated_word: w.punctuated_word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
          speaker: `SPEAKER_${String(w.speaker).padStart(2, '0')}`,
          speaker_channel: 0,
          is_flagged: w.confidence < 0.85,
        })),
      ];

      await supabase
        .from('transcriptions')
        .update({
          words: merged,
          full_transcript: merged.map((w: any) => w.punctuated_word || w.word).join(' '),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transcriptId);

      logger.info('[liveStream] Flushed words to DB', {
        sessionId,
        transcriptId,
        count: batch.length,
      });
    } catch (error) {
      logger.error(
        '[liveStream] Failed to flush words',
        error instanceof Error ? error : new Error(String(error)),
        { sessionId, transcriptId },
      );
    }
  };

  // Start Deepgram live connection
  const start = async () => {
    try {
      connection = deepgram.listen.live({
        model: 'nova-3',
        diarize: true,
        punctuate: true,
        interim_results: true,
        smart_format: true,
        endpointing: 500,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
        language: 'en-US',
      });

      connection.on('open', () => {
        logger.info('[liveStream] Deepgram connection opened', { sessionId });
      });

      connection.on('Results', (data: any) => {
        const result = data?.channel?.alternatives?.[0];
        if (!result?.words) return;

        for (const w of result.words) {
          const parsed: ParsedWord = {
            word: w.word,
            punctuated_word: w.punctuated_word || w.word,
            start: w.start,
            end: w.end,
            confidence: w.confidence,
            speaker: w.speaker ?? 0,
            is_final: data.is_final ?? false,
          };

          onWord(parsed);

          // Only buffer final words for DB persistence
          if (parsed.is_final) {
            wordBuffer.push(parsed);
          }
        }
      });

      connection.on('error', (err: any) => {
        logger.error('[liveStream] Deepgram error', err instanceof Error ? err : new Error(String(err)), { sessionId });
        onError(err instanceof Error ? err : new Error(String(err)));
      });

      connection.on('close', () => {
        logger.info('[liveStream] Deepgram connection closed', { sessionId });
      });

      // Start batch timer
      batchTimer = setInterval(flushWords, BATCH_INTERVAL_MS);
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  start();

  return {
    send(audioChunk: Buffer) {
      if (closed || !connection) return;
      try {
        connection.send(new Uint8Array(audioChunk).buffer as ArrayBuffer);
      } catch (error) {
        logger.error(
          '[liveStream] Send error',
          error instanceof Error ? error : new Error(String(error)),
          { sessionId },
        );
      }
    },

    async close() {
      if (closed) return;
      closed = true;

      if (batchTimer) {
        clearInterval(batchTimer);
        batchTimer = null;
      }

      // Flush remaining words
      await flushWords();

      if (connection) {
        try {
          connection.requestClose();
        } catch {
          // Connection may already be closed
        }
        connection = null;
      }
    },
  };
}
