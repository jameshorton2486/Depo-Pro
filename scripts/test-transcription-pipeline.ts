/**
 * scripts/test-transcription-pipeline.ts
 *
 * Integration smoke test for the Deepgram transcription pipeline.
 * Verifies the complete DB data flow without needing a live Deepgram call.
 *
 * What it tests:
 *   1. Env vars present and Supabase reachable
 *   2. Job creation (jobs table write)
 *   3. Audio path persistence (jobs.audio_file_url)
 *   4. Transcription row creation (transcriptions table)
 *   5. Flagged words extraction (flagged_words table via RPC or manual insert)
 *   6. Flagged words readable with transcription_id filter
 *   7. Transcription correction write (transcription_edits table)
 *   8. Full cleanup of test data
 *
 * Usage:
 *   npx tsx scripts/test-transcription-pipeline.ts
 *
 * Prerequisites (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
 */

import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

// ── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Test State ─────────────────────────────────────────────────────────────

const TEST_PREFIX = `pipeline-smoke-${Date.now()}`;
let firmId: string | null = null;
let userId: string | null = null;
let jobId: string | null = null;
let transcriptionId: string | null = null;

const results: Array<{ step: string; passed: boolean; detail?: string }> = [];

function pass(step: string, detail?: string) {
  results.push({ step, passed: true, detail });
  console.log(`  ✅ ${step}${detail ? ` — ${detail}` : ''}`);
}

function fail(step: string, detail?: string) {
  results.push({ step, passed: false, detail });
  console.error(`  ❌ ${step}${detail ? ` — ${detail}` : ''}`);
}

// ── Sample Words ────────────────────────────────────────────────────────────
// Realistic word-level data with 3 low-confidence words (< 0.85) to trigger
// flagged word extraction.

const SAMPLE_WORDS = [
  { word: 'Please', punctuated_word: 'Please', start: 0.0, end: 0.3, confidence: 0.98, speaker: 0 },
  { word: 'state', punctuated_word: 'state', start: 0.3, end: 0.6, confidence: 0.97, speaker: 0 },
  { word: 'your', punctuated_word: 'your', start: 0.6, end: 0.8, confidence: 0.99, speaker: 0 },
  { word: 'full', punctuated_word: 'full', start: 0.8, end: 1.0, confidence: 0.96, speaker: 0 },
  { word: 'neim', punctuated_word: 'neim', start: 1.0, end: 1.4, confidence: 0.42, speaker: 0 }, // flagged
  { word: 'My', punctuated_word: 'My', start: 1.8, end: 1.9, confidence: 0.98, speaker: 1 },
  { word: 'name', punctuated_word: 'name', start: 1.9, end: 2.2, confidence: 0.99, speaker: 1 },
  { word: 'is', punctuated_word: 'is', start: 2.2, end: 2.3, confidence: 0.99, speaker: 1 },
  { word: 'Jhon', punctuated_word: 'Jhon', start: 2.3, end: 2.6, confidence: 0.61, speaker: 1 }, // flagged
  { word: 'Smyth', punctuated_word: 'Smyth', start: 2.6, end: 3.0, confidence: 0.74, speaker: 1 }, // flagged
];

// ── Steps ───────────────────────────────────────────────────────────────────

async function step1_envAndConnectivity() {
  console.log('\nStep 1: Env vars and Supabase connectivity');
  try {
    const { error } = await supabase.from('firms').select('id').limit(1);
    if (error) {
      fail('Supabase connectivity', error.message);
      return false;
    }
    pass('Supabase connectivity');
    return true;
  } catch (e: any) {
    fail('Supabase connectivity', e.message);
    return false;
  }
}

async function step2_createTestFirmAndUser() {
  console.log('\nStep 2: Create test firm + user');
  try {
    // Create firm
    const { data: firm, error: firmErr } = await supabase
      .from('firms')
      .insert({ name: `${TEST_PREFIX}-firm` })
      .select('id')
      .single();

    if (firmErr || !firm) {
      fail('Create test firm', firmErr?.message || 'null response');
      return false;
    }
    firmId = firm.id;
    pass('Create test firm', firmId!);

    // Create user via auth admin API
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: `${TEST_PREFIX}@depo-pro.test`,
      password: 'PipelineSmoke2026!',
      email_confirm: true,
      user_metadata: { role: 'COURT_REPORTER', firm_id: firmId },
    });

    if (authErr || !authUser.user) {
      fail('Create test user', authErr?.message || 'null response');
      return false;
    }
    userId = authUser.user.id;
    pass('Create test user', userId!);

    // Ensure profile row
    await supabase.from('profiles').upsert({
      id: userId,
      email: `${TEST_PREFIX}@depo-pro.test`,
      role: 'COURT_REPORTER',
      firm_id: firmId,
    });

    return true;
  } catch (e: any) {
    fail('Create test firm/user', e.message);
    return false;
  }
}

async function step3_createJob() {
  console.log('\nStep 3: Create test job');
  try {
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        case_name: `${TEST_PREFIX}-case`,
        title: 'Pipeline Smoke Test',
        status: 'PENDING',
        created_by_id: userId,
        firm_id: firmId,
        audio_file_url: `${TEST_PREFIX}/audio/test-audio.wav`,
      })
      .select('id')
      .single();

    if (error || !job) {
      fail('Create test job', error?.message || 'null response');
      return false;
    }
    jobId = job.id;
    pass('Create test job', jobId!);
    return true;
  } catch (e: any) {
    fail('Create test job', e.message);
    return false;
  }
}

async function step4_verifyAudioPathPersisted() {
  console.log('\nStep 4: Verify audio_file_url persisted on job');
  try {
    const { data: job, error } = await supabase
      .from('jobs')
      .select('audio_file_url')
      .eq('id', jobId!)
      .single();

    if (error || !job?.audio_file_url) {
      fail('audio_file_url readable', error?.message || 'field is null');
      return false;
    }
    pass('audio_file_url persisted', job.audio_file_url);
    return true;
  } catch (e: any) {
    fail('audio_file_url readable', e.message);
    return false;
  }
}

async function step5_createTranscription() {
  console.log('\nStep 5: Create transcription row (simulating pipeline output)');
  try {
    const { data: tx, error } = await supabase
      .from('transcriptions')
      .insert({
        job_id: jobId,
        status: 'COMPLETE',
        content: SAMPLE_WORDS.map((w) => w.punctuated_word).join(' '),
        words: JSON.stringify(SAMPLE_WORDS),
        utterances: JSON.stringify([]),
        total_word_count: SAMPLE_WORDS.length,
        flagged_word_count: SAMPLE_WORDS.filter((w) => w.confidence < 0.85).length,
      })
      .select('id')
      .single();

    if (error || !tx) {
      fail('Create transcription', error?.message || 'null response');
      return false;
    }
    transcriptionId = tx.id;
    pass('Create transcription', `id=${transcriptionId}, flagged_word_count=${SAMPLE_WORDS.filter((w) => w.confidence < 0.85).length}`);
    return true;
  } catch (e: any) {
    fail('Create transcription', e.message);
    return false;
  }
}

async function step6_extractFlaggedWords() {
  console.log('\nStep 6: Extract flagged words (RPC first, manual fallback)');
  try {
    // Try the RPC first (matches pipeline behaviour)
    const { error: rpcErr } = await supabase.rpc('extract_flagged_words', {
      p_transcription_id: transcriptionId,
      p_words: SAMPLE_WORDS,
      p_confidence_threshold: 0.85,
    });

    if (!rpcErr) {
      pass('extract_flagged_words RPC executed');
    } else {
      // Manual fallback — matches extractFlaggedWordsManually() in pipeline.ts
      console.log(`    (RPC unavailable: ${rpcErr.message}) — using manual insert`);

      const flagged = SAMPLE_WORDS
        .map((word, idx) => ({ word, idx }))
        .filter(({ word }) => word.confidence < 0.85);

      const records = flagged.map(({ word, idx }) => {
        const contextBefore = SAMPLE_WORDS.slice(Math.max(0, idx - 5), idx).map((w) => w.word).join(' ');
        const contextAfter = SAMPLE_WORDS.slice(idx + 1, Math.min(SAMPLE_WORDS.length, idx + 6)).map((w) => w.word).join(' ');
        return {
          transcription_id: transcriptionId,
          word_index: idx,
          original_word: word.word,
          confidence: word.confidence,
          start_time: word.start,
          end_time: word.end,
          speaker: word.speaker,
          context_before: contextBefore,
          context_after: contextAfter,
          status: 'PENDING',
          sort_order: idx,
        };
      });

      const { error: insertErr } = await supabase.from('flagged_words').insert(records);
      if (insertErr) {
        fail('Manual flagged words insert', insertErr.message);
        return false;
      }
      pass('Flagged words manually inserted', `${records.length} records`);
    }
    return true;
  } catch (e: any) {
    fail('Extract flagged words', e.message);
    return false;
  }
}

async function step7_verifyFlaggedWordsReadable() {
  console.log('\nStep 7: Verify flagged_words readable with transcription_id filter');
  try {
    const { data: flaggedWords, error } = await supabase
      .from('flagged_words')
      .select('id, original_word, confidence, status')
      .eq('transcription_id', transcriptionId!)
      .order('sort_order', { ascending: true });

    if (error) {
      fail('Read flagged_words', error.message);
      return false;
    }

    const expectedCount = SAMPLE_WORDS.filter((w) => w.confidence < 0.85).length;
    if (!flaggedWords || flaggedWords.length !== expectedCount) {
      fail('Flagged word count', `expected ${expectedCount}, got ${flaggedWords?.length ?? 0}`);
      return false;
    }

    const allPending = flaggedWords.every((w: any) => w.status === 'PENDING');
    if (!allPending) {
      fail('All flagged words PENDING', `statuses: ${flaggedWords.map((w: any) => w.status).join(', ')}`);
      return false;
    }

    pass('Flagged words readable', `${flaggedWords.length} records, all PENDING`);
    flaggedWords.forEach((w: any) => {
      console.log(`      word="${w.original_word}" confidence=${w.confidence} status=${w.status}`);
    });
    return true;
  } catch (e: any) {
    fail('Verify flagged words', e.message);
    return false;
  }
}

async function step8_saveCorrection() {
  console.log('\nStep 8: Save a correction to transcription_edits');
  try {
    // The first flagged word is index 4 ('neim' → should be 'name')
    const { error } = await supabase.from('transcription_edits').insert({
      transcription_id: transcriptionId,
      word_index: 4,
      original_text: 'neim',
      edited_text: 'name',
      edit_type: 'WORD_CORRECTION',
      editor_id: userId,
      editor_role: 'COURT_REPORTER',
    });

    if (error) {
      fail('Save correction to transcription_edits', error.message);
      return false;
    }
    pass('Correction saved', 'word_index=4 neim→name');
    return true;
  } catch (e: any) {
    fail('Save correction', e.message);
    return false;
  }
}

async function step9_verifyJobStatusUpdatable() {
  console.log('\nStep 9: Verify job status can be updated (PENDING → COMPLETE)');
  try {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'COMPLETE', updated_at: new Date().toISOString() })
      .eq('id', jobId!);

    if (error) {
      fail('Update job status', error.message);
      return false;
    }
    pass('Job status updated to COMPLETE');
    return true;
  } catch (e: any) {
    fail('Update job status', e.message);
    return false;
  }
}

// ── Cleanup ─────────────────────────────────────────────────────────────────

async function cleanup() {
  console.log('\nCleanup: removing test data...');

  if (transcriptionId) {
    await supabase.from('transcription_edits').delete().eq('transcription_id', transcriptionId);
    await supabase.from('flagged_words').delete().eq('transcription_id', transcriptionId);
    await supabase.from('transcriptions').delete().eq('id', transcriptionId);
    console.log('  removed transcription + edits + flagged_words');
  }

  if (jobId) {
    await supabase.from('jobs').delete().eq('id', jobId);
    console.log('  removed job');
  }

  if (userId) {
    await supabase.auth.admin.deleteUser(userId);
    await supabase.from('profiles').delete().eq('id', userId);
    console.log('  removed user');
  }

  if (firmId) {
    await supabase.from('firms').delete().eq('id', firmId);
    console.log('  removed firm');
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Depo-Pro Transcription Pipeline — Integration Smoke Test');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log(`  Test prefix: ${TEST_PREFIX}`);

  const steps = [
    step1_envAndConnectivity,
    step2_createTestFirmAndUser,
    step3_createJob,
    step4_verifyAudioPathPersisted,
    step5_createTranscription,
    step6_extractFlaggedWords,
    step7_verifyFlaggedWordsReadable,
    step8_saveCorrection,
    step9_verifyJobStatusUpdatable,
  ];

  let aborted = false;
  for (const step of steps) {
    if (aborted) break;
    const ok = await step();
    if (!ok) {
      console.error('\nAborting remaining steps due to failure.');
      aborted = true;
    }
  }

  await cleanup();

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Results');
  console.log('═══════════════════════════════════════════════════════');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((r) => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`  ${icon} ${r.step}${r.detail ? ` (${r.detail})` : ''}`);
  });

  console.log(`\n  ${passed}/${results.length} steps passed`);

  if (failed > 0) {
    console.error(`\n  FAILED — ${failed} step(s) did not pass`);
    process.exit(1);
  } else {
    console.log('\n  PASSED — transcription pipeline data flow verified ✓');
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  cleanup().finally(() => process.exit(1));
});
