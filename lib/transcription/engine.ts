/**
 * lib/transcription/engine.ts  [PRODUCTION-ACCURATE v2]
 *
 * TranscriptionEngine — Single orchestration class for the entire
 * pre-recorded transcription pipeline.
 *
 * CORRECTED FROM v1 based on actual schema audit:
 *   - jobs table uses audio_file_url (not audio_file_path)
 *   - jobs table has no is_medical_expert column — model passed via EngineOptions
 *   - transcription record is created by setStatus() on first call (upsert pattern)
 *   - transcriptions table needs: original_transcript, full_transcript,
 *     original_integrity_hash, current_integrity_hash, words, segments, speakers
 *   - extractFlaggedWords takes jobId — looks up transcriptionId internally via RPC
 *   - updateJobStatus must be called with 'AI_COMPLETE' on success, 'FAILED' on error
 *   - ready-for-proofing email fires fire-and-forget via setImmediate (matches pipeline.ts)
 *   - TranscriptionPipelineStatus imported from types/transcription
 *
 * ENTRY POINT:
 *   await runTranscriptionEngine(jobId, { modelOverride: 'nova-3-medical' });
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { transcribeAudio, toPipelineFormat } from '@/lib/transcription';
import { normalizeAudioForTranscription } from '@/lib/transcription/preprocessor';
import { chunkAudio, cleanupChunks, OPTIMIZED_CHUNKING_CONFIG } from '@/lib/transcription/chunking';
import { buildKeywordsForJob } from '@/lib/transcription/buildKeywords';
import { reassembleChunks } from '@/lib/transcription/reassemble';
import { hydrateWords } from '@/lib/transcription/hydrateWords';
import { SpeakerIdentityCache } from '@/lib/transcription/speakerCache';
import {
  extractChunkTail,
  formatContextForPrompt,
  isContextStillValid,
  describeContext,
  type ChunkContext,
} from '@/lib/transcription/contextHandoff';
import { runKeyterm_AwareCorrection } from '@/lib/ai/correctionWorker';
import { logger } from '@/lib/logger';
import type { TranscriptionPipelineStatus } from '@/types/transcription';

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobRecord {
  id: string;
  firm_id: string;
  audio_file_url: string;
  deposition_id: string | null;
  title: string | null;
  case_name: string | null;
  case_number: string | null;
  deposition_date: string | null;
}

export interface EngineOptions {
  /** Force a specific model. Default: 'nova-3'. Pass 'nova-3-medical' for expert testimony. */
  modelOverride?: 'nova-3' | 'nova-3-medical';
  /** Skip AI correction pass (faster re-runs or cost control). Default: false */
  skipCorrection?: boolean;
}

const CORRECTION_CONFIDENCE_THRESHOLD = 0.85;
const MAX_CONTEXT_GAP_SECONDS = 30;

// ─── Engine class ─────────────────────────────────────────────────────────────

export class TranscriptionEngine {
  private readonly jobId: string;
  private readonly options: EngineOptions;
  private speakerCache = new SpeakerIdentityCache();
  private tempDir: string | null = null;

  constructor(jobId: string, options: EngineOptions = {}) {
    this.jobId = jobId;
    this.options = options;
  }

  async run(): Promise<{ wordCount: number }> {
    logger.info('[engine] Starting transcription run', { jobId: this.jobId });

    try {
      // ── 1. Load job ────────────────────────────────────────────────────────
      const job = await this.loadJob();
      logger.info('[engine] Job loaded', { jobId: this.jobId, firmId: job.firm_id });

      // ── 2. Build dynamic keyterms ──────────────────────────────────────────
      const keyterms = await buildKeywordsForJob(this.jobId);
      logger.info('[engine] Keyterms built', { count: keyterms.length });

      // ── 3. Determine model ─────────────────────────────────────────────────
      const model: 'nova-3' | 'nova-3-medical' = this.options.modelOverride ?? 'nova-3';
      logger.info('[engine] Model selected', { model });

      // ── 4. Download audio from Supabase Storage ────────────────────────────
      await this.setStatus('VALIDATING', 0);
      this.tempDir = path.join(os.tmpdir(), `depo-engine-${this.jobId}-${Date.now()}`);
      fs.mkdirSync(this.tempDir, { recursive: true });
      const localAudioPath = await this.downloadAudio(job.audio_file_url);
      logger.info('[engine] Audio downloaded', { localAudioPath });

      // ── 5. Normalize to 24kHz mono WAV (highpass + loudnorm applied) ───────
      const { outputPath: normalizedPath } = await normalizeAudioForTranscription(localAudioPath);
      logger.info('[engine] Audio normalized', { outputPath: normalizedPath });

      // ── 6. Silence-aware chunking (45 min / 20s overlap / WAV) ────────────
      await this.setStatus('CHUNKING', 5);
      const chunks = await chunkAudio(normalizedPath, OPTIMIZED_CHUNKING_CONFIG);
      logger.info('[engine] Audio chunked', {
        chunkCount: chunks.length,
        chunkMin: OPTIMIZED_CHUNKING_CONFIG.chunkDurationSeconds / 60,
        overlapSec: OPTIMIZED_CHUNKING_CONFIG.overlapSeconds,
        format: OPTIMIZED_CHUNKING_CONFIG.outputFormat,
      });

      // ── 7. Transcribe each chunk ───────────────────────────────────────────
      await this.setStatus('TRANSCRIBING', 10);
      let chunkContext: ChunkContext | null = null;

      type ProcessedChunk = {
        index: number;
        result: ReturnType<typeof toPipelineFormat>;
        audioStartSeconds: number;
        overlapSeconds: number;
      };
      const processedChunks: ProcessedChunk[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const progressPct = 10 + Math.round(((i + 1) / chunks.length) * 60);

        logger.info('[engine] Transcribing chunk', {
          index: i,
          total: chunks.length,
          startSec: chunk.startSeconds.toFixed(1),
          context: describeContext(chunkContext),
        });

        const audioBuffer = fs.readFileSync(chunk.filePath);
        const rawResult = await transcribeAudio(audioBuffer, {
          customKeyterms: keyterms.map((k) => k.word),
          modelPreference: model as any,
        });
        const result = toPipelineFormat(rawResult);

        // Speaker identity normalization across chunks
        if (i === 0) {
          this.speakerCache.seedFromChunk(result.words as any);
        } else {
          result.words = this.speakerCache.processChunk(result.words as any) as any;
        }

        processedChunks.push({
          index: i,
          result,
          audioStartSeconds: chunk.startSeconds,
          overlapSeconds: chunk.overlapSeconds,
        });

        // Context tail for next chunk
        if (i + 1 < chunks.length) {
          const tail = extractChunkTail(i, result.words as any);
          if (tail) {
            chunkContext = isContextStillValid(tail, chunks[i + 1].startSeconds, MAX_CONTEXT_GAP_SECONDS)
              ? tail
              : null;
          }
        }

        await this.setStatus('TRANSCRIBING', progressPct, i + 1, chunks.length);
      }

      // ── 8. Reassemble ──────────────────────────────────────────────────────
      await this.setStatus('REASSEMBLING', 75);
      const finalResult: ProcessedChunk['result'] = processedChunks.length === 1
        ? processedChunks[0].result
        : await reassembleChunks(processedChunks, OPTIMIZED_CHUNKING_CONFIG.overlapSeconds) as any;

      logger.info('[engine] Reassembly complete', { wordCount: finalResult.words.length });

      // ── 9. Persist transcript to DB ────────────────────────────────────────
      const fullTranscript: string = (finalResult as any).fullTranscript
        ?? finalResult.words.map((w: any) => w.punctuated_word ?? w.word).join(' ');
      const integrityHash = createHash('sha256').update(fullTranscript).digest('hex');

      const supabase = createAdminClient();
      await supabase
        .from('transcriptions')
        .update({
          original_transcript: fullTranscript,
          full_transcript: fullTranscript,
          original_integrity_hash: integrityHash,
          current_integrity_hash: integrityHash,
          words: finalResult.words as any,
          segments: finalResult.segments as any,
          speakers: (finalResult as any).speakers ?? [],
          total_word_count: finalResult.words.length,
          flagged_word_count: finalResult.words.filter(
            (w: any) => (w.confidence ?? 1) < CORRECTION_CONFIDENCE_THRESHOLD,
          ).length,
          status: 'COMPLETE',
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', this.jobId);

      // ── 10. Extract flagged words (SQL RPC with manual fallback) ───────────
      await this.setStatus('EXTRACTING_FLAGS', 80);
      await this.extractFlagged(finalResult.words, CORRECTION_CONFIDENCE_THRESHOLD);

      // ── 11. Get transcription ID for hydration + correction ───────────────
      const { data: transcriptionRow } = await supabase
        .from('transcriptions')
        .select('id')
        .eq('job_id', this.jobId)
        .single();

      if (transcriptionRow?.id) {
        // ── 12. Hydrate transcript_words table ─────────────────────────────
        const { inserted } = await hydrateWords(
          transcriptionRow.id,
          job.firm_id,
          finalResult.words as any,
        );
        logger.info('[engine] Hydration complete', { inserted });

        // ── 13. Confidence-driven AI correction ─────────────────────────────
        if (!this.options.skipCorrection) {
          const contextText = chunkContext ? formatContextForPrompt(chunkContext) : undefined;
          await runKeyterm_AwareCorrection(
            transcriptionRow.id,
            keyterms.map((k) => k.word),
            CORRECTION_CONFIDENCE_THRESHOLD,
            contextText,
          );
          logger.info('[engine] AI correction complete', { transcriptionId: transcriptionRow.id });
        }
      }

      // ── 14. Mark job complete ──────────────────────────────────────────────
      await this.setStatus('COMPLETE', 100);
      await supabase
        .from('jobs')
        .update({ status: 'AI_COMPLETE', updated_at: new Date().toISOString() })
        .eq('id', this.jobId);

      // ── 15. Ready-for-proofing email (fire and forget) ─────────────────────
      setImmediate(() =>
        this.sendCompletionEmail(job).catch((err) =>
          logger.warn('[engine] Email failed (non-fatal)', { error: String(err) })
        )
      );

      // ── 16. Cleanup temp files ─────────────────────────────────────────────
      try {
        await cleanupChunks(chunks);
        if (normalizedPath !== localAudioPath) fs.unlinkSync(normalizedPath);
        if (this.tempDir) fs.rmSync(this.tempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        logger.warn('[engine] Cleanup error (non-fatal)', { error: String(cleanupErr) });
      }

      logger.info('[engine] Run complete', {
        jobId: this.jobId,
        wordCount: finalResult.words.length,
        speakers: this.speakerCache.speakerCount,
      });

      return { wordCount: finalResult.words.length };

    } catch (error: any) {
      logger.error('[engine] Fatal error', error, { jobId: this.jobId });

      // Best-effort failure marking
      try {
        const supabase = createAdminClient();
        await supabase
          .from('jobs')
          .update({ status: 'FAILED', updated_at: new Date().toISOString() })
          .eq('id', this.jobId);
        await supabase
          .from('transcriptions')
          .update({ status: 'PIPELINE_FAILED', updated_at: new Date().toISOString() })
          .eq('job_id', this.jobId);
      } catch { /* ignore */ }

      try {
        if (this.tempDir) fs.rmSync(this.tempDir, { recursive: true, force: true });
      } catch { /* ignore */ }

      throw error;
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async loadJob(): Promise<JobRecord> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('jobs')
      .select('id, firm_id, audio_file_url, deposition_id, title, case_name, case_number, deposition_date')
      .eq('id', this.jobId)
      .single();

    if (error || !data) {
      throw new Error(`Job ${this.jobId} not found: ${error?.message}`);
    }

    // Handle multiple possible column name variants
    const audioUrl = (data as any).audio_file_url
      ?? (data as any).audio_file_storage_url
      ?? (data as any).audio_url;

    if (!audioUrl) {
      throw new Error(`Job ${this.jobId} has no audio file URL`);
    }

    return { ...data, audio_file_url: audioUrl } as JobRecord;
  }

  private async downloadAudio(audioFileUrl: string): Promise<string> {
    const supabase = createAdminClient();

    let storagePath: string;
    if (audioFileUrl.includes('supabase.co/storage')) {
      storagePath = audioFileUrl.split('/depo-audio/')[1] ?? audioFileUrl;
    } else if (audioFileUrl.startsWith('depo-audio/')) {
      storagePath = audioFileUrl.replace('depo-audio/', '');
    } else {
      storagePath = audioFileUrl;
    }

    logger.info('[engine] Downloading audio from storage', { storagePath });

    const { data, error } = await supabase.storage.from('depo-audio').download(storagePath);
    if (error || !data) {
      throw new Error(`Storage download failed: ${error?.message ?? 'no data'}`);
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const ext = path.extname(storagePath) || '.mp3';
    const outputPath = path.join(this.tempDir!, `audio-original${ext}`);
    fs.writeFileSync(outputPath, buffer);

    logger.info('[engine] Audio downloaded', { outputPath, bytes: buffer.length });
    return outputPath;
  }

  private async extractFlagged(words: any[], threshold: number): Promise<void> {
    const supabase = createAdminClient();

    try {
      const { data: transcription } = await supabase
        .from('transcriptions')
        .select('id')
        .eq('job_id', this.jobId)
        .single();

      if (!transcription) return;

      const { error: rpcError } = await supabase.rpc('extract_flagged_words', {
        p_transcription_id: transcription.id,
        p_threshold: threshold,
      });

      if (rpcError) {
        logger.warn('[engine] RPC fallback to manual extraction', { error: rpcError.message });
        await this.extractFlaggedManually(transcription.id, words, threshold);
      } else {
        logger.info('[engine] Flagged words extracted via SQL RPC');
      }
    } catch (err: any) {
      logger.warn('[engine] Flagged extraction failed (non-critical)', { error: err.message });
    }
  }

  private async extractFlaggedManually(
    transcriptionId: string,
    words: any[],
    threshold: number,
  ): Promise<void> {
    const supabase = createAdminClient();
    const flagged = words.filter((w) => (w.confidence ?? 1) < threshold);
    if (flagged.length === 0) return;

    const BATCH = 100;
    for (let i = 0; i < flagged.length; i += BATCH) {
      const records = flagged.slice(i, i + BATCH).map((w) => {
        const idx = words.indexOf(w);
        return {
          transcription_id: transcriptionId,
          word_index: idx,
          original_word: w.word,
          confidence: w.confidence,
          start_time: w.start,
          end_time: w.end,
          speaker: String(w.speaker ?? ''),
          context_before: words.slice(Math.max(0, idx - 5), idx).map((cw: any) => cw.word).join(' '),
          context_after: words.slice(idx + 1, Math.min(words.length, idx + 6)).map((cw: any) => cw.word).join(' '),
          status: 'PENDING',
          alternatives: null,
        };
      });
      await supabase.from('flagged_words').insert(records);
    }

    logger.info('[engine] Flagged words inserted manually', {
      count: flagged.length,
      transcriptionId,
    });
  }

  private async setStatus(
    status: TranscriptionPipelineStatus | 'SAVING' | 'CORRECTING' | 'FINALIZING',
    progress: number,
    currentChunk?: number,
    totalChunks?: number,
  ): Promise<void> {
    const supabase = createAdminClient();
    try {
      const { data: existing } = await supabase
        .from('transcriptions')
        .select('id')
        .eq('job_id', this.jobId)
        .single();

      if (existing) {
        await supabase
          .from('transcriptions')
          .update({ status: status as any, updated_at: new Date().toISOString() })
          .eq('job_id', this.jobId);
      } else {
        await supabase.from('transcriptions').insert({
          job_id: this.jobId,
          status: status as any,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      logger.info(`[engine] Status → ${status} (${progress}%)`, { currentChunk, totalChunks });
    } catch (err: any) {
      logger.warn('[engine] Status update failed (non-critical)', { error: err.message });
    }
  }

  private async sendCompletionEmail(_job: JobRecord): Promise<void> {
    const { sendEmail, readyForProofingEmail } = await import('@/lib/email');
    const supabase = createAdminClient();

    const { data: notifyJob } = await supabase
      .from('jobs')
      .select(`
        id, title, case_name, case_number, deposition_date,
        reporter:profiles!jobs_reporter_id_fkey(id, full_name, email),
        scopist:profiles!jobs_scopist_id_fkey(id, full_name, email)
      `)
      .eq('id', this.jobId)
      .single();

    if (!notifyJob) return;

    const { data: transcriptionRow } = await supabase
      .from('transcriptions')
      .select('id')
      .eq('job_id', this.jobId)
      .single();

    const { count: flaggedCount } = await supabase
      .from('flagged_words')
      .select('*', { count: 'exact', head: true })
      .eq('transcription_id', transcriptionRow?.id ?? '')
      .eq('status', 'PENDING');

    const reporter = (notifyJob as any).reporter;
    const scopist = (notifyJob as any).scopist;
    const recipient = scopist?.email ? scopist : reporter;
    if (!recipient?.email) return;

    await sendEmail(readyForProofingEmail({
      recipientName: recipient.full_name || recipient.email,
      recipientEmail: recipient.email,
      caseStyle: notifyJob.case_name || notifyJob.title || 'Unknown Case',
      causeNumber: notifyJob.case_number || 'N/A',
      deponentName: notifyJob.title?.replace('Deposition of ', '') || 'Unknown Deponent',
      depositionDate: notifyJob.deposition_date
        ? new Date(notifyJob.deposition_date).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
          })
        : 'Unknown date',
      jobId: this.jobId,
      transcriptId: transcriptionRow?.id ?? '',
      flaggedWordCount: flaggedCount ?? 0,
    }));

    logger.info('[engine] Completion email sent', { recipient: recipient.email });
  }
}

// ─── Convenience export ───────────────────────────────────────────────────────

/**
 * Drop-in replacement for processTranscriptionJob(jobId, audioUrl).
 * The engine reads audio_file_url directly from the jobs table.
 *
 * In app/api/jobs/[id]/transcribe/route.ts, replace:
 *   processTranscriptionJob(jobId, audioUrlForTranscription)
 * with:
 *   runTranscriptionEngine(jobId, { modelOverride: ... })
 */
export async function runTranscriptionEngine(
  jobId: string,
  options: EngineOptions = {},
): Promise<{ wordCount: number }> {
  return new TranscriptionEngine(jobId, options).run();
}
