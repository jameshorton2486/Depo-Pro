import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");
const env = parseEnv(await readFile(envPath, "utf8"));

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in .env.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
await ensureAnonymousSession(supabase);

const now = Date.now();
const caseId = `case_transcript_verify_${now}`;
const jobId = `job_verify_${now}`;
const transcriptId = `tr_${jobId}`;
let insertedCasePayload = null;

await step("insert case row", async () => {
  const { error } = await supabase.from("cases").insert({
    case_id: caseId,
    proceeding_type: "freelance_deposition",
    stage: "workspace",
    notes: "transcript verification",
    payload: {
      version: "1.0",
      case_id: caseId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      proceeding_type: "freelance_deposition",
      stage: "workspace",
      notes: "transcript verification",
    },
  });

  if (error) {
    throw error;
  }

  insertedCasePayload = {
    version: "1.0",
    case_id: caseId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    proceeding_type: "freelance_deposition",
    stage: "workspace",
    notes: "transcript verification",
  };

  return { case_id: caseId };
});

await step("insert transcript job row", async () => {
  const { error } = await supabase.from("transcripts").insert({
    transcript_id: transcriptId,
    case_id: caseId,
    job_id: jobId,
    media_url: "cases/demo/audio/demo.mp3",
    based_on: "audio_verify",
    session_id: null,
    source_filename: "offline-fixture.wav",
    media_kind: "audio",
    status: "completed",
    engine: "offline-fixture",
    transcription_source: "offline-fixture",
    sequence_index: 0,
    duration: 12.4,
    duration_seconds: 12.4,
    word_count: 3,
    utterance_count: 1,
    speaker_count: 1,
    avg_confidence: "0.9000",
    raw_storage_path: `cases/${caseId}/transcripts/${jobId}/raw.json`,
    raw_checksum: "verify",
    last_error: null,
    speaker_map_confirmed: false,
  });

  if (error) {
    throw error;
  }

  return { transcript_id: transcriptId, job_id: jobId };
});

await step("insert canonical rows", async () => {
  const { error: speakerError } = await supabase.from("transcript_speakers").insert({
    transcript_id: transcriptId,
    speaker_id: "spk_000",
    display_name: "Speaker 0",
    deepgram_speaker: 0,
    role: null,
    job_id: jobId,
    speaker_index: 0,
    speaker_label: "Speaker 0",
    assigned_name: null,
    speaker_role: null,
    word_count: 3,
  });
  if (speakerError) throw speakerError;

  const { error: utteranceError } = await supabase.from("transcript_utterances").insert({
    transcript_id: transcriptId,
    utterance_id: "utt_000000",
    speaker_id: "spk_000",
    start_time: 0,
    end_time: 1.5,
    ordinal: 0,
    job_id: jobId,
    utterance_index: 0,
    speaker_index: 0,
    speaker_label: "Speaker 0",
    text: "Good morning um",
    avg_confidence: "0.9000",
  });
  if (utteranceError) throw utteranceError;

  const { error: wordError } = await supabase.from("transcript_words").insert([
    {
      transcript_id: transcriptId,
      utterance_id: "utt_000000",
      word_id: "w_00000000",
      speaker_id: "spk_000",
      ordinal: 0,
      text: "Good",
      raw_text: "Good",
      start_time: 0,
      end_time: 0.4,
      confidence: 0.99,
      reviewed: false,
      edited: false,
      job_id: jobId,
      word_index: 0,
      working_text: null,
      speaker_index: 0,
      is_filler: false,
      removed: false,
    },
    {
      transcript_id: transcriptId,
      utterance_id: "utt_000000",
      word_id: "w_00000001",
      speaker_id: "spk_000",
      ordinal: 1,
      text: "morning",
      raw_text: "morning",
      start_time: 0.4,
      end_time: 1.0,
      confidence: 0.91,
      reviewed: false,
      edited: false,
      job_id: jobId,
      word_index: 1,
      working_text: null,
      speaker_index: 0,
      is_filler: false,
      removed: false,
    },
    {
      transcript_id: transcriptId,
      utterance_id: "utt_000000",
      word_id: "w_00000002",
      speaker_id: "spk_000",
      ordinal: 2,
      text: "um",
      raw_text: "um",
      start_time: 1.0,
      end_time: 1.5,
      confidence: 0.8,
      reviewed: false,
      edited: false,
      job_id: jobId,
      word_index: 2,
      working_text: null,
      speaker_index: 0,
      is_filler: true,
      removed: false,
    },
  ]);
  if (wordError) throw wordError;

  const { error: auditError } = await supabase.from("transcript_audit_log").insert({
    transcript_id: transcriptId,
    change_id: `chg_ingest_${jobId}`,
    utterance_id: null,
    word_id: null,
    old_text: null,
    new_text: null,
    source: "system",
    suggestion_id: null,
    reviewer_user_id: null,
    case_id: caseId,
    job_id: jobId,
    actor: null,
    action: "ingest",
    before_text: null,
    after_text: null,
  });
  if (auditError) throw auditError;

  return { speakers: 1, utterances: 1, words: 3 };
});

await step("verify counts", async () => {
  const [speakers, utterances, words] = await Promise.all([
    supabase.from("transcript_speakers").select("speaker_id", { count: "exact", head: true }).eq("transcript_id", transcriptId),
    supabase.from("transcript_utterances").select("utterance_id", { count: "exact", head: true }).eq("transcript_id", transcriptId),
    supabase.from("transcript_words").select("word_id", { count: "exact", head: true }).eq("transcript_id", transcriptId),
  ]);

  if (speakers.error) throw speakers.error;
  if (utterances.error) throw utterances.error;
  if (words.error) throw words.error;

  assertEqual(speakers.count, 1, "speaker count mismatch");
  assertEqual(utterances.count, 1, "utterance count mismatch");
  assertEqual(words.count, 3, "word count mismatch");

  return { speakers: speakers.count, utterances: utterances.count, words: words.count };
});

await step("raw_text is immutable", async () => {
  const { error } = await supabase
    .from("transcript_words")
    .update({ raw_text: "Changed" })
    .eq("transcript_id", transcriptId)
    .eq("word_id", "w_00000000");

  if (!error) {
    throw new Error("expected raw_text update to fail, but it succeeded");
  }

  return { message: error.message };
});

await step("mark archived", async () => {
  const archivedPayload = {
    ...(insertedCasePayload ?? {}),
    archived: true,
  };

  const { data, error } = await supabase
    .from("cases")
    .update({ payload: archivedPayload })
    .eq("case_id", caseId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  assertEqual(data.payload.archived, true, "archived flag was not persisted");
  return { case_id: data.case_id, archived: data.payload.archived };
});

async function step(label, fn) {
  try {
    const result = await fn();
    console.log(`PASS ${label}`);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log(`FAIL ${label}`);
    console.log(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

async function ensureAnonymousSession(client) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }

  if (sessionData.session) {
    return sessionData.session;
  }

  const { data, error } = await client.auth.signInAnonymously();
  if (error) {
    throw error;
  }

  return data.session;
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\nexpected: ${expected}\nactual:   ${actual}`);
  }
}

function parseEnv(contents) {
  const result = {};
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }
    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    result[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
  return result;
}
