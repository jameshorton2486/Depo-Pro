/**
 * app/api/transcribe/live/route.ts  — KEYTERM INJECTION PATCH
 *
 * This patch shows the exact changes to inject dynamic keyterms into the
 * live session. Currently createLiveSession() is called with no keyterms.
 *
 * ─────────────────────────────────────────────────────────────────
 * CHANGE 1 — Add buildKeywordsForJob import
 * ─────────────────────────────────────────────────────────────────
 *
 * ADD after existing imports:
 *   import { buildKeywordsForJob } from '@/lib/transcription/buildKeywords';
 *
 * ─────────────────────────────────────────────────────────────────
 * CHANGE 2 — Load keyterms and pass them into createLiveSession
 * ─────────────────────────────────────────────────────────────────
 *
 * FIND the existing session creation block (~lines 75-90):
 *
 *   const session = createLiveSession(
 *     newSessionId,
 *     transcriptId,
 *     (word) => {
 *       wordQueue.push(word);
 *     },
 *     (error) => {
 *       logger.error('[live] Session error', error, { sessionId: newSessionId });
 *     },
 *   );
 *
 * REPLACE WITH:
 *
 *   // Load case-specific keyterms for accuracy boost
 *   // Best-effort: if the job lookup fails, session still starts with no keyterms
 *   let liveKeyterms: string[] = [];
 *   try {
 *     if (transcript.job_id) {
 *       const keywordConfigs = await buildKeywordsForJob(transcript.job_id);
 *       liveKeyterms = keywordConfigs.map((k) => k.word);
 *     }
 *   } catch (keytermError) {
 *     logger.warn('[live] Keyterm load failed (non-fatal)', {
 *       sessionId: newSessionId,
 *       error: String(keytermError),
 *     });
 *   }
 *
 *   const session = createLiveSession(
 *     newSessionId,
 *     transcriptId,
 *     (word) => {
 *       wordQueue.push(word);
 *     },
 *     (error) => {
 *       logger.error('[live] Session error', error, { sessionId: newSessionId });
 *     },
 *     {
 *       keyterms: liveKeyterms,   // ← Dynamic case-specific keyterms
 *       sampleRate: 48000,        // ← Matches browser MediaRecorder default
 *     },
 *   );
 *
 * ─────────────────────────────────────────────────────────────────
 * IMPACT:
 * ─────────────────────────────────────────────────────────────────
 * Virtually no live transcription platforms inject keyterms into the
 * Deepgram live connection. This is one of the most impactful accuracy
 * improvements available specifically to Depo-Pro because:
 *
 *   1. Court reporter names (e.g., "Miah Bardot") are loaded from the
 *      participants table and injected before the first word is spoken.
 *
 *   2. Case-specific firm vocabulary and cause numbers (e.g., 2025-CI-12281)
 *      are already stored in custom_vocabularies — they now flow into live too.
 *
 *   3. The keyterm load is wrapped in try/catch so a DB hiccup never blocks
 *      the live session from starting.
 */
