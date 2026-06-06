import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { editorApiFixture, rawFixturePacket } from "./fixtures/editor-api-fixture.mjs";

const env = await loadEnv();
const supabaseUrl = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const seedOwnerUserId = env.SEED_OWNER_USER_ID;
const seedUserEmail = env.SEED_USER_EMAIL;
const seedUserPassword = env.SEED_USER_PASSWORD;

if (!supabaseUrl) {
  throw new Error("seed-editor-transcript.mjs requires SUPABASE_URL or VITE_SUPABASE_URL.");
}

const usingServiceRole = Boolean(serviceRoleKey);
const usingUserCredentials = Boolean(seedUserEmail && seedUserPassword);

if (usingServiceRole && !seedOwnerUserId) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY requires SEED_OWNER_USER_ID for owner-scoped seeding.");
}

if (!usingServiceRole && !usingUserCredentials) {
  throw new Error(
    "seed-editor-transcript.mjs requires either SUPABASE_SERVICE_ROLE_KEY + SEED_OWNER_USER_ID or SEED_USER_EMAIL + SEED_USER_PASSWORD.",
  );
}

if (!serviceRoleKey && !anonKey) {
  throw new Error("A Supabase key is required. Provide SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY.");
}

const authMode = usingServiceRole ? "service-role" : "password-session";
const supabase = createClient(supabaseUrl, serviceRoleKey ?? anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

let ownerUserId = seedOwnerUserId ?? "";

if (!usingServiceRole) {
  const session = await ensurePasswordSession(supabase, seedUserEmail, seedUserPassword);
  ownerUserId = session.user.id;
}

if (!ownerUserId) {
  throw new Error("Unable to determine seed owner user id.");
}

const now = Date.now();
const caseId = `case_editor_api_${now}`;
const transcriptId = `tr_editor_api_${now}`;
const deepgramJobId = `job_editor_api_${now}`;
const audioId = `audio_editor_api_${now}`;
const audioPath = `${ownerUserId}/${caseId}/audio/${audioId}.wav`;
const rawPath = `${ownerUserId}/${caseId}/transcripts/${deepgramJobId}/raw.json`;

const rawJson = JSON.stringify(rawFixturePacket, null, 2);
const rawChecksum = createHash("sha256").update(rawJson).digest("hex");
const rawBytes = new TextEncoder().encode(rawJson);
const audioBytes = buildMockWav(Math.max(1, Math.ceil(editorApiFixture.document.duration)));

await uploadObject(audioPath, audioBytes, "audio/wav");
await uploadObject(rawPath, rawBytes, "application/json");

for (const exhibit of editorApiFixture.exhibits) {
  const exhibitPath = `${ownerUserId}/${caseId}/exhibits/${exhibit.exhibit_id}.txt`;
  await uploadObject(exhibitPath, new TextEncoder().encode(exhibit.description), "text/plain");
  exhibit.storage_path = exhibitPath;
}

await insertCase();
await insertAudio();
await insertTranscript();
await insertSpeakers();
await insertUtterances();
await insertWords();
await insertAudit();
await insertSuggestions();
await insertExhibits();
await insertReviewState();

const seedMetadata = {
  caseId,
  transcriptId,
  routeJobId: transcriptId,
  deepgramJobId,
  ownerUserId,
  audioPath,
  rawPath,
  outputAt: new Date().toISOString(),
};

const outputPath = path.join(os.tmpdir(), "depo-pro-editor-api-seed.json");
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(seedMetadata, null, 2), "utf8");

console.log("PASS seed editor transcript");
console.log(JSON.stringify({ ...seedMetadata, outputPath, authMode }, null, 2));

async function uploadObject(storagePath, bytes, contentType) {
  const { error } = await supabase.storage
    .from("case-files")
    .upload(storagePath, bytes, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw error;
  }
}

async function insertCase() {
  const payload = {
    version: "1.0",
    case_id: caseId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stage: "workspace",
    caption: {
      case_name: "Editor API Seed Transcript",
      case_number: "SEED-EDITOR-001",
    },
    witnesses: [{ name: "Jonathan Michael Hargrove" }],
  };

  const { error } = await supabase.from("cases").insert({
    owner_user_id: ownerUserId,
    case_id: caseId,
    proceeding_type: "freelance_deposition",
    stage: "workspace",
    notes: "Editor API seed transcript",
    payload,
  });

  if (error) {
    throw error;
  }
}

async function insertAudio() {
  const { error } = await supabase.from("case_audio").insert({
    owner_user_id: ownerUserId,
    case_id: caseId,
    audio_id: audioId,
    original_filename: "editor-api-seed.wav",
    mime_type: "audio/wav",
    duration_seconds: editorApiFixture.document.duration,
    file_size_bytes: audioBytes.byteLength,
    uploaded_at: new Date().toISOString(),
    storage_path: audioPath,
    media_url: null,
  });

  if (error) {
    throw error;
  }
}

async function insertTranscript() {
  const { error } = await supabase.from("transcripts").insert({
    owner_user_id: ownerUserId,
    transcript_id: transcriptId,
    case_id: caseId,
    job_id: deepgramJobId,
    media_url: null,
    duration: editorApiFixture.document.duration,
    based_on: "editor-api-seed",
    deepgram_request_id: null,
    session_id: null,
    source_filename: "editor-api-seed.wav",
    media_kind: "audio",
    status: "completed",
    engine: "offline-fixture",
    transcription_source: "offline-fixture",
    sequence_index: 0,
    duration_seconds: editorApiFixture.document.duration,
    word_count: editorApiFixture.document.words.length,
    utterance_count: editorApiFixture.document.utterances.length,
    speaker_count: editorApiFixture.document.speakers.length,
    avg_confidence: averageConfidence(editorApiFixture.document.words),
    raw_storage_path: rawPath,
    raw_checksum: rawChecksum,
    last_error: null,
    speaker_map_confirmed: false,
  });

  if (error) {
    throw error;
  }
}

async function insertSpeakers() {
  const rows = editorApiFixture.document.speakers.map((speaker) => ({
    owner_user_id: ownerUserId,
    transcript_id: transcriptId,
    speaker_id: speaker.speaker_id,
    display_name: speaker.display_name,
    deepgram_speaker: speaker.deepgram_speaker,
    role: speaker.role?.toLowerCase() ?? null,
    job_id: deepgramJobId,
    speaker_index: speaker.deepgram_speaker,
    speaker_label: speaker.display_name,
    assigned_name: null,
    speaker_role: speaker.role?.toLowerCase() ?? null,
    word_count: editorApiFixture.document.words.filter((word) => word.speaker_id === speaker.speaker_id).length,
  }));

  const { error } = await supabase.from("transcript_speakers").insert(rows);
  if (error) {
    throw error;
  }
}

async function insertUtterances() {
  const rows = editorApiFixture.document.utterances.map((utterance, utteranceIndex) => {
    const utteranceWords = editorApiFixture.document.words.filter((word) => word.utterance_id === utterance.utterance_id);
    const speaker = editorApiFixture.document.speakers.find((item) => item.speaker_id === utterance.speaker_id);
    const avgConfidence = utteranceWords.reduce((sum, word) => sum + word.confidence, 0) / Math.max(utteranceWords.length, 1);

    return {
      owner_user_id: ownerUserId,
      transcript_id: transcriptId,
      utterance_id: utterance.utterance_id,
      speaker_id: utterance.speaker_id,
      start_time: utterance.start_time,
      end_time: utterance.end_time,
      ordinal: utteranceIndex,
      job_id: deepgramJobId,
      utterance_index: utteranceIndex,
      speaker_index: speaker?.deepgram_speaker ?? utteranceIndex,
      speaker_label: speaker?.display_name ?? utterance.speaker_id,
      text: utteranceWords.map((word) => word.text).join(" "),
      avg_confidence: avgConfidence.toFixed(4),
    };
  });

  const { error } = await supabase.from("transcript_utterances").insert(rows);
  if (error) {
    throw error;
  }
}

async function insertWords() {
  const speakerIndexById = new Map(editorApiFixture.document.speakers.map((speaker) => [speaker.speaker_id, speaker.deepgram_speaker]));
  const rows = editorApiFixture.document.words.map((word, wordIndex) => ({
    owner_user_id: ownerUserId,
    transcript_id: transcriptId,
    utterance_id: word.utterance_id,
    word_id: word.word_id,
    speaker_id: word.speaker_id,
    ordinal: wordIndex,
    text: word.text,
    raw_text: word.raw_text,
    start_time: word.start_time,
    end_time: word.end_time,
    confidence: word.confidence,
    reviewed: false,
    edited: false,
    job_id: deepgramJobId,
    word_index: wordIndex,
    working_text: null,
    speaker_index: speakerIndexById.get(word.speaker_id) ?? 0,
    is_filler: word.raw_text.toLowerCase() === "um",
    removed: false,
  }));

  const { error } = await supabase.from("transcript_words").insert(rows);
  if (error) {
    throw error;
  }
}

async function insertAudit() {
  const { error } = await supabase.from("transcript_audit_log").insert({
    owner_user_id: ownerUserId,
    transcript_id: transcriptId,
    change_id: `chg_ingest_${deepgramJobId}`,
    utterance_id: null,
    word_id: null,
    old_text: null,
    new_text: null,
    source: "system",
    suggestion_id: null,
    reviewer_user_id: null,
    case_id: caseId,
    job_id: deepgramJobId,
    actor: null,
    action: "ingest",
    before_text: null,
    after_text: null,
  });

  if (error) {
    throw error;
  }
}

async function insertSuggestions() {
  const rows = editorApiFixture.suggestions.map((suggestion) => ({
    owner_user_id: ownerUserId,
    transcript_id: transcriptId,
    suggestion_id: suggestion.suggestion_id,
    word_id: suggestion.word_id,
    utterance_id: suggestion.utterance_id,
    original_text: suggestion.original_text,
    suggested_text: suggestion.suggested_text,
    reason: suggestion.reason,
    confidence: suggestion.confidence,
    status: suggestion.status,
  }));

  const { error } = await supabase.from("transcript_suggestions").insert(rows);
  if (error) {
    throw error;
  }
}

async function insertExhibits() {
  const rows = editorApiFixture.exhibits.map((exhibit) => ({
    owner_user_id: ownerUserId,
    case_id: caseId,
    exhibit_id: exhibit.exhibit_id,
    label: exhibit.label,
    description: exhibit.description,
    filename: exhibit.filename,
    storage_path: exhibit.storage_path,
    file_url: null,
    marked_by: null,
    admitted: false,
    page_reference: null,
    line_reference: null,
  }));

  const { error } = await supabase.from("case_exhibits").insert(rows);
  if (error) {
    throw error;
  }
}

async function insertReviewState() {
  const { error } = await supabase.from("transcript_review_state").insert({
    owner_user_id: ownerUserId,
    transcript_id: transcriptId,
    reviewed_word_ids: [],
    unreviewed_word_ids: [],
    review_complete: false,
    review_pct: 0,
  });

  if (error) {
    throw error;
  }
}

async function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  const env = { ...process.env };

  try {
    const file = await readFile(envPath, "utf8");
    for (const line of file.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) {
        continue;
      }
      const separator = line.indexOf("=");
      if (separator <= 0) {
        continue;
      }
      const key = line.slice(0, separator).trim();
      const rawValue = line.slice(separator + 1).trim();
      if (!(key in env)) {
        env[key] = rawValue.replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {
    // process env only
  }

  return env;
}

async function ensurePasswordSession(client, email, password) {
  let signInData = null;
  let signInError = null;

  try {
    const result = await client.auth.signInWithPassword({ email, password });
    signInData = result.data;
    signInError = result.error;
  } catch (error) {
    signInError = error;
  }

  if (!signInError && signInData?.session) {
    return signInData.session;
  }

  let signUpData = null;
  let signUpError = null;

  try {
    const result = await client.auth.signUp({ email, password });
    signUpData = result.data;
    signUpError = result.error;
  } catch (error) {
    signUpError = error;
  }

  if (signUpError) {
    throw signInError ?? signUpError;
  }

  if (signUpData?.session) {
    return signUpData.session;
  }

  let retryData = null;
  let retryError = null;

  try {
    const result = await client.auth.signInWithPassword({ email, password });
    retryData = result.data;
    retryError = result.error;
  } catch (error) {
    retryError = error;
  }

  if (retryError || !retryData?.session) {
    throw retryError ?? new Error("Sign-up succeeded but no password session was established.");
  }

  return retryData.session;
}

function averageConfidence(words) {
  if (words.length === 0) {
    return 0;
  }

  return Number((words.reduce((sum, word) => sum + word.confidence, 0) / words.length).toFixed(4));
}

function buildMockWav(durationSeconds) {
  const sampleRate = 8_000;
  const totalSamples = sampleRate * durationSeconds;
  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  for (let index = 0; index < totalSamples; index += 1) {
    view.setInt16(44 + (index * bytesPerSample), 0, true);
  }

  return new Uint8Array(buffer);
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
