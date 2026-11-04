// One-time consolidation: enforce a single "Deposition Transcript" per case.
//
// For every case that has at least one COMPLETED transcript, the NEWEST completed
// transcript (by created_at) is kept as the case's Deposition Transcript and
// EVERY OTHER transcript for that case is removed — this includes both completed
// extras AND leftover non-completed job rows (failed / finalizing / queued /
// processing) that clutter the "Transcript Jobs" list.
//
// Deleting a `transcripts` row cascades to every child table (words, utterances,
// speakers, audit, review_state, suggestions, speaker_resolution_current,
// corrections, correction_runs, correction_decisions); the un-linked
// `transcription_jobs` ledger row is deleted explicitly (a failed job may have a
// job row but no transcripts row — this still removes it).
//
// SAFETY:
//   * Dry-run by DEFAULT — prints the plan and writes nothing. Pass --apply to delete.
//   * A case with NO completed transcript is skipped entirely (no keeper — we never
//     delete a case down to nothing).
//   * Certified cases (case_certifications.certification_date set) are NEVER touched —
//     reported and skipped (locked official records protected by a DB trigger).
//   * In-progress rows (queued/processing/finalizing) are flagged ⚠ in the dry-run so
//     you can confirm they are stale before deleting one mid-flight.
//   * Requires SUPABASE_SERVICE_ROLE_KEY (RLS has no delete policy on these tables).
//
// Usage:
//   node scripts/prune-extra-transcripts.mjs            # dry-run (default)
//   node scripts/prune-extra-transcripts.mjs --apply    # perform deletions

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const IN_PROGRESS = new Set(["queued", "processing", "finalizing"]);

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

// 1. Completed transcripts — the only valid "keeper" candidates.
const { data: completedRows, error: completedError } = await supabase
  .from("transcripts")
  .select("transcript_id, case_id, created_at")
  .eq("status", "completed");
if (completedError) throw completedError;

const completedByCase = new Map(); // case_id -> [{transcript_id, created_at}]
const completedIds = new Set();
for (const row of completedRows ?? []) {
  completedIds.add(row.transcript_id);
  const list = completedByCase.get(row.case_id) ?? [];
  list.push(row);
  completedByCase.set(row.case_id, list);
}

// 2. ALL transcription-job rows (any status) — the full set of transcript_ids per
//    case, so we sweep failed/finalizing/queued leftovers, not just completed extras.
const { data: jobRows, error: jobError } = await supabase
  .from("transcription_jobs")
  .select("transcript_id, case_id, status, created_at");
if (jobError) throw jobError;

const jobStatusByCase = new Map(); // case_id -> Map<transcript_id, status>
for (const row of jobRows ?? []) {
  const m = jobStatusByCase.get(row.case_id) ?? new Map();
  if (!m.has(row.transcript_id)) m.set(row.transcript_id, row.status);
  jobStatusByCase.set(row.case_id, m);
}

// 3. Plan: keep the newest completed transcript per case, delete every other
//    transcript_id for that case (completed extras + non-completed job rows).
const plans = [];
for (const [caseId, completedList] of completedByCase) {
  const keeper = [...completedList].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  const ids = new Set(completedList.map((r) => r.transcript_id));
  for (const tid of jobStatusByCase.get(caseId)?.keys() ?? []) ids.add(tid);
  ids.delete(keeper.transcript_id);
  if (ids.size === 0) continue;
  const toDelete = [...ids].map((tid) => ({
    transcript_id: tid,
    status: jobStatusByCase.get(caseId)?.get(tid) ?? (completedIds.has(tid) ? "completed" : "unknown"),
  }));
  plans.push({ caseId, keeper, toDelete });
}

if (plans.length === 0) {
  console.log("Every case already has a single Deposition Transcript and no leftover jobs. Nothing to do.");
  process.exit(0);
}

// 4. Certified (locked) cases — skip.
const { data: certRows, error: certError } = await supabase
  .from("case_certifications")
  .select("case_id, certification_date")
  .in("case_id", plans.map((p) => p.caseId));
if (certError) throw certError;
const certifiedCaseIds = new Set(
  (certRows ?? []).filter((r) => Boolean(r.certification_date)).map((r) => r.case_id),
);

let casesPlanned = 0;
let casesSkippedCertified = 0;
let deletedCount = 0;
let failedCount = 0;
let wouldDelete = 0;

for (const { caseId, keeper, toDelete } of plans) {
  if (certifiedCaseIds.has(caseId)) {
    casesSkippedCertified += 1;
    console.log(`SKIP  case ${caseId} — CERTIFIED (locked). ${toDelete.length + 1} transcripts/jobs left intact.`);
    continue;
  }

  casesPlanned += 1;
  wouldDelete += toDelete.length;
  console.log(`CASE  ${caseId}`);
  console.log(`  KEEP   ${keeper.transcript_id}  (Deposition Transcript — completed, created ${keeper.created_at})`);

  for (const target of toDelete) {
    const counts = await childCounts(target.transcript_id);
    const flag = IN_PROGRESS.has(target.status) ? " ⚠ in-progress — confirm it is stale" : "";
    console.log(
      `  DELETE ${target.transcript_id}  [${target.status}]${flag}  ` +
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
console.log(`  cases needing cleanup:     ${plans.length}`);
console.log(`  cases planned:             ${casesPlanned}`);
console.log(`  cases skipped (certified): ${casesSkippedCertified}`);
if (APPLY) {
  console.log(`  transcripts/jobs deleted:  ${deletedCount}`);
  console.log(`  deletions failed:          ${failedCount}`);
  if (failedCount > 0) {
    process.exitCode = 1;
  }
} else {
  console.log(`  transcripts/jobs that WOULD be deleted: ${wouldDelete}`);
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
// transcription_jobs ledger row is removed explicitly (also covers failed jobs that
// have a job row but no transcripts row).
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
