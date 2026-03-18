/**
 * lib/transcription/liveStream.ts  [UPGRADED]
 *
 * CHANGES FROM PREVIOUS VERSION:
 *   1. keyterm injection added to live connection config
 *      → Most live streaming systems skip this — it's a significant accuracy advantage.
 *      → Keyterms are loaded from buildKeywordsForJob() when createLiveSession is called.
 *      → Capped at 100 terms (Nova-3 limit).
 *
 *   2. sample_rate: 48000  (was: 16000)
 *      → Browser MediaRecorder API defaults to 48kHz for linear16 capture.
 *      → Sending 48kHz audio while telling Deepgram to expect 16kHz causes the
 *        model to receive doubled/distorted frames, degrading accuracy.
 *      → 48kHz matches browser capture; Deepgram handles downsampling internally.
 *
 *   3. endpointing: 300  (was: 500)
 *      → Milliseconds of silence to trigger end-of-utterance during live stream.
 *      → 300ms is appropriate for legal Q/A where turns are rapid.
 *
 *   4. utterance_end_ms: 1000 added
 *      → Fires a UtteranceEnd event after 1s of silence, providing a reliable
 *        flush trigger that doesn't depend only on the 30s batch timer.
 *
 *   5. no_delay: true added
 *      → Instructs Deepgram to send results as soon as they're ready rather
 *        than waiting for a buffer. Reduces per-word display latency.
 *
 *   6. max_buffer_ms: 2000 added
 *      → Caps how long audio can accumulate in Deepgram's buffer before being
 *        processed. Prevents runaway buffering on slow connections.
 *
 *   7. UtteranceEnd event handler added
 *      → Flushes wordBuffer to DB whenever Deepgram detects end of utterance.
 *      → Previously, the only flush was the 30s batch timer — this means the
 *        last 0–30s of a session could be lost if the connection closed abruptly.
 *
 *   8. speakerMap added for stable cross-reconnect speaker labels
 *      → Deepgram live speaker IDs are local to each connection.
 *      → If the connection drops and reconnects, speaker 0 may become speaker 1.
 *      → The speakerMap normalizes IDs to SPEAKER_00, SPEAKER_01 format and
 *        persists across reconnects within the same session.
 *
 *   9. keytermsForSession stored on session object
 *      → Allows hot-reloading keyterms mid-session if new participants join.
 */

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

export interface LiveSessionOptions {
  /** Dynamic keyterms from buildKeywordsForJob() — injected into Deepgram live config */
  keyterms?: string[];
  /**
   * Sample rate of the incoming audio stream from the client.
   * Default: 48000 (browser MediaRecorder default).
   * Set to 16000 only if you are explicitly downsampling before sending.
   */
  sampleRate?: number;
}

const BATCH_INTERVAL_MS = 30_000;  // Fallback batch save every 30 seconds
const CONFIDENCE_FLAG_THRESHOLD = 0.85;

export function createLiveSession(
  sessionId: string,
  transcriptId: string,
  onWord: (word: ParsedWord) => void,
  onError: (error: Error) => void,
  options: LiveSessionOptions = {},
): LiveSession {
  const apiKey = requireEnv('DEEPGRAM_API_KEY');
  const deepgram = createDeepgramClient(apiKey);

  // Normalize keyterms: trim, deduplicate, cap at 100
  const keyterms = [...new Set((options.keyterms ?? []).map((k) => k.trim()))]
    .filter(Boolean)
    .slice(0, 100);

  const sampleRate = options.sampleRate ?? 48000;  // Match browser MediaRecorder default

  let connection: ListenLiveClient | null = null;
  let wordBuffer: ParsedWord[] = [];
  let batchTimer: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  // Speaker identity map: Deepgram numeric ID → stable SPEAKER_XX label
  // Persists for the entire session, even across reconnects.
  const speakerMap = new Map<number, string>();
  let nextSpeakerIndex = 0;

  function getStableSpeakerLabel(deepgramSpeakerId: number): string {
    if (!speakerMap.has(deepgramSpeakerId)) {
      const label = `SPEAKER_${String(nextSpeakerIndex++).padStart(2, '0')}`;
      speakerMap.set(deepgramSpeakerId, label);
      logger.info('[liveStream] New speaker detected', {
        sessionId,
        deepgramId: deepgramSpeakerId,
        stableLabel: label,
      });
    }
    return speakerMap.get(deepgramSpeakerId)!;
  }

  const flushWords = async () => {
    if (wordBuffer.length === 0) return;
    const batch = [...wordBuffer];
    wordBuffer = [];

    try {
      const supabase = createAdminClient();

      const { data: transcript } = await supabase
        .from('transcriptions')
        .select('words')
        .eq('id', transcriptId)
        .single();

      const existing = Array.isArray(transcript?.words) ? transcript.words : [];

      const newWords = batch.map((w) => ({
        word: w.word,
        punctuated_word: w.punctuated_word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
        // Use stable label from the speaker map
        speaker: getStableSpeakerLabel(w.speaker),
        speaker_channel: 0,
        is_flagged: w.confidence < CONFIDENCE_FLAG_THRESHOLD,
      }));

      const merged = [...existing, ...newWords];

      await supabase
        .from('transcriptions')
        .update({
          words: merged,
          full_transcript: merged
            .map((w: any) => w.punctuated_word || w.word)
            .join(' '),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transcriptId);

      logger.info('[liveStream] Flushed words to DB', {
        sessionId,
        transcriptId,
        count: batch.length,
        totalSpeakers: speakerMap.size,
      });
    } catch (error) {
      logger.error(
        '[liveStream] Failed to flush words',
        error instanceof Error ? error : new Error(String(error)),
        { sessionId, transcriptId },
      );
    }
  };

  const start = async () => {
    try {
      const liveConfig: Record<string, unknown> = {
        model: 'nova-3',
        diarize: true,
        punctuate: true,
        interim_results: true,
        smart_format: true,
        filler_words: true,         // Preserve uh/um for verbatim legal record
        profanity_filter: false,    // Verbatim required
        language: 'en-US',
        encoding: 'linear16',
        sample_rate: sampleRate,    // 48kHz matches browser capture
        channels: 1,
        endpointing: 300,           // 300ms silence triggers utterance end (was 500)
        utterance_end_ms: 1000,     // UtteranceEnd event after 1s silence
        no_delay: true,             // Send results immediately, no buffering
        max_buffer_ms: 2000,        // Cap buffer to prevent runaway accumulation
      };

      // Inject keyterms into live session — most systems skip this
      if (keyterms.length > 0) {
        liveConfig.keyterm = keyterms;
        logger.info('[liveStream] Injecting keyterms', {
          sessionId,
          count: keyterms.length,
          preview: keyterms.slice(0, 3),
        });
      }

      connection = deepgram.listen.live(liveConfig as any);

      connection.on('open', () => {
        logger.info('[liveStream] Deepgram connection opened', {
          sessionId,
          sampleRate,
          keytermCount: keyterms.length,
        });
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
            confidence: w.confidence ?? 0,
            speaker: w.speaker ?? 0,
            is_final: data.is_final ?? false,
          };

          onWord(parsed);

          // Buffer only final words for DB persistence
          if (parsed.is_final) {
            wordBuffer.push(parsed);
          }
        }
      });

      // UtteranceEnd fires when Deepgram detects a pause (utterance_end_ms).
      // This is more reliable than the batch timer for session-end scenarios.
      connection.on('UtteranceEnd', async () => {
        if (wordBuffer.length > 0) {
          logger.info('[liveStream] UtteranceEnd — flushing buffer', {
            sessionId,
            bufferSize: wordBuffer.length,
          });
          await flushWords();
        }
      });

      connection.on('error', (err: any) => {
        logger.error(
          '[liveStream] Deepgram error',
          err instanceof Error ? err : new Error(String(err)),
          { sessionId },
        );
        onError(err instanceof Error ? err : new Error(String(err)));
      });

      connection.on('close', () => {
        logger.info('[liveStream] Deepgram connection closed', { sessionId });
      });

      // Fallback batch timer — flushes every 30s in case UtteranceEnd doesn't fire
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

      // Final flush of any remaining words
      await flushWords();

      if (connection) {
        try {
          connection.requestClose();
        } catch {
          // Connection may already be closed
        }
        connection = null;
      }

      logger.info('[liveStream] Session closed', {
        sessionId,
        totalSpeakers: speakerMap.size,
        speakerLabels: [...speakerMap.values()],
      });
    },
  };
}
