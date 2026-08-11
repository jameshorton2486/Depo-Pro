// One-time consolidation: enforce one transcript per case by deleting the extra
// transcripts left behind by the old (additive) retranscription behavior.
//
// For every case that has more than one COMPLETED transcript, the NEWEST
// completed transcript (by created_at) is kept and all other transcripts for
// that case are removed. Deleting a `transcripts` row cascades to every child
// table (words, utterances, speakers, audit, review_state, suggestions,
// speaker_resolution_current, corrections, correction_runs, correction_decisions);
// the un-linked `transcription_jobs` ledger row is deleted explicitly.
//
// SAFETY:
//   * Dry-run by DEFAULT — prints the plan and writes nothing. Pass --apply to delete.
//   * Certified cases (case_certifications.certification_date set) are NEVER
//     touched — they are reported and skipped. Their transcripts are locked
//     official records protected by a DB trigger.
//   * Requires SUPABASE_SERVICE_ROLE_KEY (RLS has no delete policy on these tables).
//
// Usage:
//   node scripts/prune-extra-transcripts.mjs            # dry-run (default)
//   node scripts/prune-extra-transcripts.mjs --apply    # perform deletions

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const APPLY = process.argv.includes("--apply");

const envPath = path.join(process.cwd(), ".env");
const env = parseEnv(await readFile(envPath, "utf8"));

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env (service role is needed to delete transcripts).",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`\nprune-extra-transcripts — mode: ${APPLY ? "APPLY (deleting)" : "DRY-RUN (no writes)"}\n`);

// 1. Load all completed transcripts.
const { data: transcriptRows, error: transcriptError } = await supabase
  .from("transcripts")
  .select("transcript_id, case_id, status, created_at")
  .eq("status", "completed");
if (transcriptError) throw transcriptError;

// 2. Group by case and find cases with >1 completed transcript.
const byCase = new Map();
for (const row of transcriptRows ?? []) {
  const list = byCase.get(row.case_id) ?? [];
  list.push(row);
  byCase.set(row.case_id, list);
}

const multi = [...byCase.entries()].filter(([, list]) => list.length > 1);
if (multi.length === 0) {
  console.log("No case has more than one completed transcript. Nothing to do.");
  process.exit(0);
}

// 3. Which of these cases are certified (locked)?
const caseIds = multi.map(([caseId]) => caseId);
const { data: certRows, error: certError } = await supabase
  .from("case_certifications")
  .select("case_id, certification_date")
  .in("case_id", caseIds);
if (certError) throw certError;
const certifiedCaseIds = new Set(
  (certRows ?? []).filter((row) => Boolean(row.certification_date)).map((row) => row.case_id),
);

let casesPlanned = 0;
let casesSkippedCertified = 0;
let deletedCount = 0;
let failedCount = 0;

for (const [caseId, list] of multi) {
  const ordered = [...list].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const keeper = ordered[0];
  const toDelete = ordered.slice(1);

  if (certifiedCaseIds.has(caseId)) {
    casesSkippedCertified += 1;
    console.log(`SKIP  case ${caseId} — CERTIFIED (locked). ${list.length} transcripts left intact.`);
    continue;
  }

  casesPlanned += 1;
  console.log(`CASE  ${caseId} — ${list.length} completed transcripts`);
  console.log(`  KEEP   ${keeper.transcript_id}  (created ${keeper.created_at})`);

  for (const target of toDelete) {
    const counts = await childCounts(target.transcript_id);
    console.log(
      `  DELETE ${target.transcript_id}  (created ${target.created_at})  ` +
        `words=${counts.words} utterances=${counts.utterances} speakers=${counts.speakers}`,
    );

    if (!APPLY) {
      continue;
    }

    try {
      await deleteTranscriptVersion(target.transcript_id);
      deletedCount += 1;
      console.log(`         deleted.`);
    } catch (deleteError) {
      failedCount += 1;
      console.log(`         FAILED: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
    }
  }
}

console.log("\nSummary");
console.log(`  cases with extras:        ${multi.length}`);
console.log(`  cases planned:            ${casesPlanned}`);
console.log(`  cases skipped (certified):${casesSkippedCertified}`);
if (APPLY) {
  console.log(`  transcripts deleted:      ${deletedCount}`);
  console.log(`  transcripts failed:       ${failedCount}`);
  if (failedCount > 0) {
    process.exitCode = 1;
  }
} else {
  const wouldDelete = multi
    .filter(([caseId]) => !certifiedCaseIds.has(caseId))
    .reduce((sum, [, list]) => sum + (list.length - 1), 0);
  console.log(`  transcripts that WOULD be deleted: ${wouldDelete}`);
  console.log("\nDry-run only. Re-run with --apply to perform the deletions.");
}

async function childCounts(transcriptId) {
  const [words, utterances, speakers] = await Promise.all([
    supabase.from("transcript_words").select("word_id", { count: "exact", head: true }).eq("transcript_id", transcriptId),
    supabase.from("transcript_utterances").select("utterance_id", { count: "exact", head: true }).eq("transcript_id", transcriptId),
    supabase.from("transcript_speakers").select("speaker_id", { count: "exact", head: true }).eq("transcript_id", transcriptId),
  ]);
  return {
    words: words.count ?? 0,
    utterances: utterances.count ?? 0,
    speakers: speakers.count ?? 0,
  };
}

// Mirrors deleteTranscriptVersion() in supabase/functions/_shared/transcriptFinalize.ts:
// cascade delete of the transcripts row removes all child tables; the un-linked
// transcription_jobs ledger row is removed explicitly.
async function deleteTranscriptVersion(transcriptId) {
  const { error: transcriptDeleteError } = await supabase
    .from("transcripts")
    .delete()
    .eq("transcript_id", transcriptId);
  if (transcriptDeleteError) throw transcriptDeleteError;

  const { error: jobDeleteError } = await supabase
    .from("transcription_jobs")
    .delete()
    .eq("transcript_id", transcriptId);
  if (jobDeleteError) throw jobDeleteError;
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
