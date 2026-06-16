// Dev-only diagnostic: exports a single transcript to DOCX for local inspection. Not part of the build; do not ship.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { SQL } from "bun";
import { createClient } from "@supabase/supabase-js";

import { buildStageSDocxBlob, type ExportTranscriptSegment } from "../src/components/ExportScreen/exportDocx.ts";
import { normalizeCaseRecord } from "../src/lib/normalizeCaseRecord.ts";
import type { Database } from "../src/types/database.ts";
import type { CaseRecord } from "../src/types/case.ts";
import type { EditorDocument, Speaker } from "../src/api/types.ts";

type TranscriptRow = Database["public"]["Tables"]["transcripts"]["Row"] & {
  job_id: string;
  source_filename?: string | null;
  sequence_index?: number | null;
  duration_seconds?: number | null;
  status?: string | null;
};

type CaseRow = Database["public"]["Tables"]["cases"]["Row"];
type TranscriptSpeakerRow = {
  speaker_id: string;
  display_name: string;
  deepgram_speaker: number;
  role: string | null;
  speaker_index: number;
  speaker_label: string;
  assigned_name: string | null;
  speaker_role: string | null;
  word_count: number;
};
type TranscriptUtteranceRow = {
  utterance_id: string;
  speaker_id: string;
  start_time: number;
  end_time: number;
  utterance_index: number;
  speaker_index: number;
  speaker_label: string;
  text: string;
};
type TranscriptWordRow = {
  word_id: string;
  utterance_id: string;
  speaker_id: string;
  start_time: number;
  end_time: number;
  confidence: number;
  reviewed: boolean;
  working_text: string | null;
  raw_text: string;
  speaker_index: number;
  removed: boolean;
};

const TRANSCRIPT_ID = "tr_1781559088619_7rch7i";
const OUTPUT_DIR = "C:\\Users\\james\\Downloads";
const OUTPUT_FILENAME = "Heath_Thomas_Current_DEPO_PRO_Export.docx";

function parseEnvFile(text: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const delimiterIndex = line.indexOf("=");
    if (delimiterIndex <= 0) {
      continue;
    }

    const key = line.slice(0, delimiterIndex).trim();
    const value = line.slice(delimiterIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    values[key] = value;
  }

  return values;
}

async function loadEnv(): Promise<Record<string, string>> {
  const values: Record<string, string> = {};
  const candidates = [".env", ".env.local"];

  for (const candidate of candidates) {
    const file = Bun.file(path.resolve(candidate));
    if (!(await file.exists())) {
      continue;
    }

    Object.assign(values, parseEnvFile(await file.text()));
  }

  return values;
}

function inferSpeakerRole(role: string | null | undefined): Speaker["role"] | undefined {
  switch ((role ?? "").trim().toLowerCase()) {
    case "court_reporter":
    case "reporter":
      return "REPORTER";
    case "witness":
      return "WITNESS";
    case "attorney":
    case "examining_attorney":
    case "defending_attorney":
      return "ATTORNEY";
    case "interpreter":
      return "INTERPRETER";
    case "other":
      return "OTHER";
    default:
      return undefined;
  }
}

function buildEditorDocument(
  transcript: TranscriptRow,
  speakers: TranscriptSpeakerRow[],
  utterances: TranscriptUtteranceRow[],
  words: TranscriptWordRow[],
): EditorDocument {
  const wordIdsByUtterance = new Map<string, string[]>();

  for (const word of words) {
    if (word.removed) {
      continue;
    }

    const ids = wordIdsByUtterance.get(word.utterance_id) ?? [];
    ids.push(word.word_id);
    wordIdsByUtterance.set(word.utterance_id, ids);
  }

  return {
    job_id: transcript.transcript_id,
    media_url: transcript.media_url ?? "",
    duration: transcript.duration_seconds ?? transcript.duration ?? 0,
    speakers: speakers.map((speaker) => ({
      speaker_id: speaker.speaker_id,
      display_name: speaker.assigned_name || speaker.speaker_label || speaker.display_name,
      deepgram_speaker: speaker.speaker_index ?? speaker.deepgram_speaker,
      role: inferSpeakerRole(speaker.speaker_role || speaker.role),
    })),
    utterances: utterances.map((utterance) => ({
      utterance_id: utterance.utterance_id,
      speaker_id: utterance.speaker_id,
      start_time: utterance.start_time,
      end_time: utterance.end_time,
      word_ids: wordIdsByUtterance.get(utterance.utterance_id) ?? [],
    })),
    words: words
      .filter((word) => !word.removed)
      .map((word) => ({
        word_id: word.word_id,
        text: word.working_text ?? word.raw_text,
        raw_text: word.raw_text,
        speaker_id: word.speaker_id,
        utterance_id: word.utterance_id,
        start_time: word.start_time,
        end_time: word.end_time,
        confidence: word.confidence,
        reviewed: word.reviewed,
        edited: Boolean(word.working_text && word.working_text !== word.raw_text),
      })),
  };
}

async function main() {
  const env = await loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
  const databaseUrl = env.DIRECT_URL || env.DATABASE_URL || null;

  if (!databaseUrl && (!supabaseUrl || !supabaseAnonKey)) {
    throw new Error("Missing direct database URL and Supabase anon credentials in .env/.env.local.");
  }

  const {
    transcript,
    caseRow,
    speakers,
    utterances,
    words,
    dataSource,
  } = databaseUrl
    ? await loadFromDatabase(databaseUrl)
    : await loadFromSupabaseApi(supabaseUrl!, supabaseAnonKey!, env);

  const record = normalizeCaseRecord(caseRow.payload) as CaseRecord;

  const document = buildEditorDocument(transcript, speakers, utterances, words);
  const segments: ExportTranscriptSegment[] = [{
    transcriptId: transcript.transcript_id,
    sequenceIndex: transcript.sequence_index ?? 0,
    sourceFilename: transcript.source_filename ?? null,
    document,
    snapshot: {
      job: transcript as never,
      speakers: speakers as never,
      utterances: utterances as never,
      words: words as never,
      speakerResolutionOverlay: [],
    },
  }];

  const blob = await buildStageSDocxBlob(segments, record);
  const buffer = Buffer.from(await blob.arrayBuffer());
  const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILENAME);

  try {
    await mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || (error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
  await writeFile(outputPath, buffer);

  console.log(JSON.stringify({
    transcriptId: TRANSCRIPT_ID,
    caseId: transcript.case_id,
    exportPath: outputPath,
    fileSize: buffer.byteLength,
    pageCount: null,
    mechanism: "buildStageSDocxBlob",
    dataSource,
  }, null, 2));
}

await main();

async function loadFromDatabase(databaseUrl: string): Promise<{
  transcript: TranscriptRow;
  caseRow: CaseRow;
  speakers: TranscriptSpeakerRow[];
  utterances: TranscriptUtteranceRow[];
  words: TranscriptWordRow[];
  dataSource: "direct-database";
}> {
  const sql = new SQL(databaseUrl);

  try {
    const transcriptRows = await sql<TranscriptRow[]>`
      select *
      from transcripts
      where transcript_id = ${TRANSCRIPT_ID}
      limit 1
    `;
    const transcript = transcriptRows[0];
    if (!transcript) {
      throw new Error(`Transcript ${TRANSCRIPT_ID} not found.`);
    }

    const [
      caseRows,
      speakers,
      utterances,
      words,
    ] = await Promise.all([
      sql<CaseRow[]>`
        select *
        from cases
        where case_id = ${transcript.case_id}
        limit 1
      `,
      sql<TranscriptSpeakerRow[]>`
        select *
        from transcript_speakers
        where job_id = ${transcript.job_id}
        order by speaker_index asc
      `,
      sql<TranscriptUtteranceRow[]>`
        select *
        from transcript_utterances
        where job_id = ${transcript.job_id}
        order by utterance_index asc
      `,
      sql<TranscriptWordRow[]>`
        select *
        from transcript_words
        where job_id = ${transcript.job_id}
        order by word_index asc
      `,
    ]);

    const caseRow = caseRows[0];
    if (!caseRow) {
      throw new Error(`Case ${transcript.case_id} not found for transcript ${TRANSCRIPT_ID}.`);
    }

    return {
      transcript,
      caseRow,
      speakers,
      utterances,
      words,
      dataSource: "direct-database",
    };
  } finally {
    await sql.close();
  }
}

async function loadFromSupabaseApi(
  supabaseUrl: string,
  supabaseAnonKey: string,
  env: Record<string, string>,
): Promise<{
  transcript: TranscriptRow;
  caseRow: CaseRow;
  speakers: TranscriptSpeakerRow[];
  utterances: TranscriptUtteranceRow[];
  words: TranscriptWordRow[];
  dataSource: "supabase-data-api";
}> {
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  if (env.VITE_DEV_AUTH_BYPASS_EMAIL && env.VITE_DEV_AUTH_BYPASS_PASSWORD) {
    const { error } = await client.auth.signInWithPassword({
      email: env.VITE_DEV_AUTH_BYPASS_EMAIL,
      password: env.VITE_DEV_AUTH_BYPASS_PASSWORD,
    });
    if (error) {
      throw error;
    }
  } else {
    const { error } = await client.auth.signInAnonymously();
    if (error) {
      throw error;
    }
  }

  const { data: transcriptData, error: transcriptError } = await client
    .from("transcripts")
    .select("*")
    .eq("transcript_id", TRANSCRIPT_ID)
    .maybeSingle();

  if (transcriptError) {
    throw transcriptError;
  }
  if (!transcriptData) {
    throw new Error(`Transcript ${TRANSCRIPT_ID} not found.`);
  }

  const transcript = transcriptData as unknown as TranscriptRow;

  const [
    caseResult,
    speakersResult,
    utterancesResult,
    wordsResult,
  ] = await Promise.all([
    client.from("cases").select("*").eq("case_id", transcript.case_id).maybeSingle(),
    client
      .from("transcript_speakers")
      .select("*")
      .eq("job_id", transcript.job_id)
      .order("speaker_index", { ascending: true }),
    client
      .from("transcript_utterances")
      .select("*")
      .eq("job_id", transcript.job_id)
      .order("utterance_index", { ascending: true }),
    client
      .from("transcript_words")
      .select("*")
      .eq("job_id", transcript.job_id)
      .order("word_index", { ascending: true }),
  ]);

  if (caseResult.error) throw caseResult.error;
  if (speakersResult.error) throw speakersResult.error;
  if (utterancesResult.error) throw utterancesResult.error;
  if (wordsResult.error) throw wordsResult.error;

  if (!caseResult.data) {
    throw new Error(`Case ${transcript.case_id} not found for transcript ${TRANSCRIPT_ID}.`);
  }

  return {
    transcript,
    caseRow: caseResult.data as CaseRow,
    speakers: (speakersResult.data ?? []) as unknown as TranscriptSpeakerRow[],
    utterances: (utterancesResult.data ?? []) as unknown as TranscriptUtteranceRow[],
    words: (wordsResult.data ?? []) as unknown as TranscriptWordRow[],
    dataSource: "supabase-data-api",
  };
}
