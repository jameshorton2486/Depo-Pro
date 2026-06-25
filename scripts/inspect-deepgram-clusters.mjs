#!/usr/bin/env node
// READ-ONLY diagnostic. No writes, no network, no dependencies.
//
// Usage:
//   node .\scripts\inspect-deepgram-clusters.mjs <path-to-deepgram-response.json>

import { readFile } from "node:fs/promises";
import path from "node:path";

const SHORT_UTTERANCE_WORDS = 4;
const PREVIEW_CHARS = 60;

const inputPath = process.argv[2] ?? "./etminan_deepgram_response.json";

function fail(message) {
  console.error(`\n[inspect] ${message}\n`);
  process.exit(1);
}

function pad(value, width) {
  return String(value).padStart(width, " ");
}

function fmtTime(seconds) {
  if (!Number.isFinite(seconds)) return "  --  ";
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${pad(m, 2)}:${s}`;
}

function preview(text) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > PREVIEW_CHARS ? `${clean.slice(0, PREVIEW_CHARS)}...` : clean;
}

let raw;
try {
  raw = await readFile(path.resolve(inputPath), "utf8");
} catch (error) {
  fail(`could not read "${inputPath}": ${error.message}`);
}

let payload;
try {
  payload = JSON.parse(raw);
} catch (error) {
  fail(`file is not valid JSON: ${error.message}`);
}

if (payload?.url && payload?.callback_url) {
  fail("this looks like a _deepgram_request.json. Point me at the _deepgram_response.json.");
}

if (payload?.sources && payload?.transcript_id && !payload?.results) {
  fail("this looks like a _multifile_manifest.json. Point me at an individual _file_NN_deepgram_response.json.");
}

const results = payload?.results;
const alt = results?.channels?.[0]?.alternatives?.[0];

if (!alt) {
  fail("no results.channels[0].alternatives[0] found; this does not look like a Deepgram response payload.");
}

const words = Array.isArray(alt.words) ? alt.words : [];
const utterances = Array.isArray(results.utterances) ? results.utterances : [];
const duration = payload?.metadata?.duration ?? null;
const requestId = payload?.metadata?.request_id ?? "(none)";
const source = payload?.metadata?.transcription_source ?? "(unset)";

console.log("\n========================================================");
console.log(" DEEPGRAM RESPONSE INSPECTION (read-only)");
console.log("========================================================");
console.log(` file              : ${inputPath}`);
console.log(` request_id        : ${requestId}`);
console.log(` transcription_src : ${source}`);
console.log(` duration (s)      : ${duration ?? "(none)"}`);
console.log(` word-level tokens : ${words.length}`);
console.log(
  ` results.utterances: ${utterances.length}${utterances.length === 0 ? "  <-- EMPTY: pipeline would use speaker-change fallback" : ""}`,
);

console.log("\n--------------------------------------------------------");
console.log(" 1. SPEAKER CLUSTERS");
console.log("--------------------------------------------------------");

const perSpeaker = new Map();
for (const w of words) {
  const idx = typeof w.speaker === "number" ? w.speaker : -1;
  const entry = perSpeaker.get(idx) ?? { words: 0, time: 0, first: Infinity, last: -Infinity };
  entry.words += 1;
  if (Number.isFinite(w.start) && Number.isFinite(w.end)) {
    entry.time += Math.max(0, w.end - w.start);
    entry.first = Math.min(entry.first, w.start);
    entry.last = Math.max(entry.last, w.end);
  }
  perSpeaker.set(idx, entry);
}

const speakerIds = [...perSpeaker.keys()].sort((a, b) => a - b);
console.log(` distinct speaker_index values: ${speakerIds.length}  -> [${speakerIds.join(", ")}]`);
console.log("");
console.log(" idx |   words |  speak(s) |   first  |   last   | share");
console.log(" ----+---------+-----------+----------+----------+------");

for (const id of speakerIds) {
  const entry = perSpeaker.get(id);
  const share = words.length ? ((entry.words / words.length) * 100).toFixed(1) : "0.0";
  console.log(
    ` ${pad(id, 3)} | ${pad(entry.words, 7)} | ${pad(entry.time.toFixed(1), 9)} | ${fmtTime(entry.first)} | ${fmtTime(entry.last)} | ${pad(share, 4)}%`,
  );
}

let switches = 0;
for (let i = 1; i < words.length; i += 1) {
  if (words[i].speaker !== words[i - 1].speaker) switches += 1;
}

const shortUtterances = utterances.filter((u) => (u.words?.length ?? 0) <= SHORT_UTTERANCE_WORDS).length;
const tinySpeakers = speakerIds.filter((id) => (perSpeaker.get(id)?.words ?? 0) <= 3);

const mergedUtterances = [];
utterances.forEach((u, i) => {
  const set = new Set((u.words ?? []).map((w) => w.speaker).filter((s) => typeof s === "number"));
  if (set.size > 1) {
    mergedUtterances.push({
      index: i,
      speakers: [...set].sort((a, b) => a - b),
      text: preview(u.transcript),
    });
  }
});

console.log("");
console.log(" OVER-SPLIT signals:");
console.log(`   - speaker switches between adjacent words : ${switches}`);
console.log(`   - short utterances (<= ${SHORT_UTTERANCE_WORDS} words)            : ${shortUtterances} of ${utterances.length}`);
console.log(`   - speakers with <= 3 words total          : ${tinySpeakers.length ? `[${tinySpeakers.join(", ")}]` : "none"}`);
console.log("");
console.log(" TRUE-MERGE signals:");

if (mergedUtterances.length === 0) {
  console.log("   - none found: every utterance's words share one speaker_index.");
} else {
  console.log(`   - ${mergedUtterances.length} utterance(s) contain more than one word-level speaker:`);
  for (const item of mergedUtterances.slice(0, 15)) {
    console.log(`       utt #${pad(item.index, 4)}  speakers [${item.speakers.join(", ")}]  "${item.text}"`);
  }
  if (mergedUtterances.length > 15) {
    console.log(`       ... and ${mergedUtterances.length - 15} more`);
  }
}

console.log("");
console.log(" UTTERANCE TIMELINE (first 40):");
console.log("   #   | spk |  start  |  words | text");
console.log("   ----+-----+---------+--------+-----------------------------");

utterances.slice(0, 40).forEach((u, i) => {
  const spk = typeof u.speaker === "number" ? u.speaker : (u.words?.[0]?.speaker ?? "?");
  console.log(`   ${pad(i, 3)} | ${pad(spk, 3)} | ${fmtTime(u.start)} | ${pad(u.words?.length ?? 0, 6)} | ${preview(u.transcript)}`);
});

if (utterances.length > 40) {
  console.log(`   ... and ${utterances.length - 40} more utterances`);
}

console.log("\n--------------------------------------------------------");
console.log(" 2. DEEPGRAM PARAGRAPHS");
console.log("--------------------------------------------------------");

const paragraphsContainer = alt.paragraphs;
const paragraphList = Array.isArray(paragraphsContainer?.paragraphs) ? paragraphsContainer.paragraphs : null;

if (!paragraphsContainer || !paragraphList) {
  console.log(" RESULT: alternatives[0].paragraphs is absent or has no .paragraphs array.");
} else {
  const totalSentences = paragraphList.reduce(
    (sum, paragraph) => sum + (Array.isArray(paragraph.sentences) ? paragraph.sentences.length : 0),
    0,
  );
  const withSpeaker = paragraphList.filter((paragraph) => typeof paragraph.speaker === "number").length;
  console.log(" RESULT: paragraphs present.");
  console.log(`   - paragraph blocks        : ${paragraphList.length}`);
  console.log(`   - total sentences         : ${totalSentences}`);
  console.log(`   - paragraphs w/ speaker[] : ${withSpeaker} of ${paragraphList.length}`);
  console.log(`   - utterances (for compare): ${utterances.length}`);
  console.log(`   - paragraph transcript?   : ${typeof paragraphsContainer.transcript === "string" ? "yes" : "no"}`);
  console.log("");
  console.log(" SAMPLE — first paragraph:");
  const first = paragraphList[0];
  console.log(`   start=${fmtTime(first.start)} end=${fmtTime(first.end)} speaker=${first.speaker ?? "(none)"} num_words=${first.num_words ?? "?"}`);
  (first.sentences ?? []).slice(0, 5).forEach((sentence, i) => {
    console.log(`     sent ${i}: [${fmtTime(sentence.start)}-${fmtTime(sentence.end)}] ${preview(sentence.text)}`);
  });
}

console.log("\n--------------------------------------------------------");
console.log(" READOUT (signals only)");
console.log("--------------------------------------------------------");
console.log(` speakers=${speakerIds.length}  word-switches=${switches}  short-utts=${shortUtterances}  merged-utts=${mergedUtterances.length}`);
console.log(` paragraphs=${paragraphList ? paragraphList.length : "ABSENT"}`);

if (mergedUtterances.length === 0) {
  console.log(" -> No intra-utterance merge detected: leans CLEAN OVER-SPLIT.");
} else {
  console.log(" -> Intra-utterance multi-speaker found: leans TRUE MERGE.");
}

console.log("");
