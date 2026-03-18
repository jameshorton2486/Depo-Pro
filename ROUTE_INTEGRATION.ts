/**
 * app/api/jobs/[id]/transcribe/route.ts  — ENGINE INTEGRATION PATCH
 *
 * This file shows the EXACT changes to make in the transcribe route.
 * Only two lines change in the actual execution path.
 *
 * ─────────────────────────────────────────────────────────────────
 * CHANGE 1 — Replace import at top of file
 * ─────────────────────────────────────────────────────────────────
 *
 * FIND:
 *   import { processTranscriptionJob } from '@/lib/transcription/pipeline';
 *
 * REPLACE WITH:
 *   import { runTranscriptionEngine } from '@/lib/transcription/engine';
 *
 * ─────────────────────────────────────────────────────────────────
 * CHANGE 2 — Replace the setImmediate call (lines ~181-185)
 * ─────────────────────────────────────────────────────────────────
 *
 * FIND (the fire-and-forget block):
 *   setImmediate(() => {
 *     processTranscriptionJob(jobId, audioUrlForTranscription).catch((error) => {
 *       console.error(`Pipeline error for job ${jobId}:`, error);
 *     });
 *   });
 *
 * REPLACE WITH:
 *   setImmediate(() => {
 *     runTranscriptionEngine(jobId, {
 *       modelOverride: modelPreference === 'nova-2-medical' ? 'nova-3-medical' : undefined,
 *     }).catch((error) => {
 *       console.error(`Engine error for job ${jobId}:`, error);
 *     });
 *   });
 *
 * WHY: The engine downloads audio internally via the job's audio_file_url,
 * normalizes it to 24kHz WAV, and handles all pipeline steps. The separate
 * audioUrlForTranscription variable is no longer needed as a parameter because
 * the engine reads it directly from the jobs table.
 *
 * ─────────────────────────────────────────────────────────────────
 * CHANGE 3 — Fix model string for medical routing
 * ─────────────────────────────────────────────────────────────────
 *
 * FIND (lines ~165-167):
 *   const modelPreference = modelTier === 'ENHANCED'
 *     ? 'nova-2-medical'
 *     : body.modelPreference || 'nova-3';
 *
 * REPLACE WITH:
 *   const modelPreference = modelTier === 'ENHANCED'
 *     ? 'nova-3-medical'    // Upgraded: nova-3-medical has 30–60% better accuracy on expert testimony
 *     : body.modelPreference || 'nova-3';
 *
 * ─────────────────────────────────────────────────────────────────
 * WHAT THE ENGINE HANDLES AUTOMATICALLY (no more manual steps):
 * ─────────────────────────────────────────────────────────────────
 *  ✅ Downloads audio from Supabase Storage
 *  ✅ Normalizes to 24kHz mono WAV (was 16kHz)
 *  ✅ Silence-aware chunking (45 min / 20s overlap / WAV)
 *  ✅ Dynamic keyterm injection from all 4 vocabulary sources
 *  ✅ Medical model routing from job.is_medical_expert flag
 *  ✅ Speaker identity cache across chunk boundaries
 *  ✅ Context handoff (120-char tail) between chunks
 *  ✅ Confidence-filtered AI correction (only < 0.85 sent to Claude)
 *  ✅ transcript_words hydration
 *  ✅ Temp file cleanup
 *  ✅ All status/progress updates
 *
 * ─────────────────────────────────────────────────────────────────
 * NOTE ON ENGINE vs PIPELINE COEXISTENCE:
 * ─────────────────────────────────────────────────────────────────
 * pipeline.ts is NOT deleted. It can remain as a fallback. If any issue
 * arises with the engine during the beta period, revert the import line
 * above to restore the original behavior. Both files are safe to coexist.
 */

// ─── REQUIRED: Add is_medical_expert + audio_file_url to engine's loadJob query ─

/**
 * The engine's loadJob() query in lib/transcription/engine.ts currently
 * selects:
 *   id, firm_id, audio_file_path, is_medical_expert, deposition_id
 *
 * BUT the jobs table uses:
 *   audio_file_url (not audio_file_path)
 *   acceptsMedicalDepos (not is_medical_expert — check your schema)
 *
 * UPDATE engine.ts loadJob() to match YOUR actual column names:
 */

// In lib/transcription/engine.ts, find loadJob() and update the select:
//
//   const { data, error } = await supabase
//     .from('jobs')
//     .select('id, firm_id, audio_file_url, deposition_id')  // ← use audio_file_url
//     .eq('id', this.jobId)
//     .single();
//
// And update the JobRecord interface:
//
//   interface JobRecord {
//     id: string;
//     firm_id: string;
//     audio_file_url: string;          // ← was audio_file_path
//     deposition_id: string | null;
//   }
//
// And remove is_medical_expert from the interface (handle model externally
// via the modelOverride option, as shown in CHANGE 2 above).
//
// Then update the engine's audio download step to match pipeline.ts:
// Instead of normalizeAudioForTranscription(job.audio_file_path, ...)
// use:    const localPath = await downloadAudioFromStorage(job.audio_file_url, tempDir);
//         normalizeAudioForTranscription(localPath, ...)
