import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { SQL } from "bun";

import { buildStageSDocxParagraphSpecs, type ExportTranscriptSegment } from "../src/components/ExportScreen/exportDocx.ts";
import { normalizeCaseRecord } from "../src/lib/normalizeCaseRecord.ts";
import { buildResolvedSpeakerViews } from "../src/lib/transcript/resolvedSpeakers.ts";
import { buildWorkspaceParagraphs } from "../src/lib/transcript/workspaceParagraphs.ts";
import type { EditorDocument, Speaker } from "../src/api/types.ts";
import type { Database } from "../src/types/database.ts";
import type { CaseRecord } from "../src/types/case.ts";

const TRANSCRIPT_ID = "tr_1781559088619_7rch7i";
const OUTPUT_PATH = path.resolve("docs/audits/TRANSCRIPT_SOURCE_OF_TRUTH_AUDIT.md");

type TranscriptRow = Database["public"]["Tables"]["transcripts"]["Row"] & {
  duration_seconds?: number | null;
  sequence_index?: number | null;
  source_filename?: string | null;
};

type CaseRow = Database["public"]["Tables"]["cases"]["Row"];

type TranscriptSpeakerRow = {
  speaker_id: string;
  display_name: string;
  deepgram_speaker: number;
  role: string | null;
  job_id: string;
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
  ordinal: number;
  job_id: string;
  utterance_index: number;
  speaker_index: number;
  speaker_label: string;
  text: string;
  avg_confidence: string | null;
};

type TranscriptWordRow = {
  word_id: string;
  utterance_id: string;
  speaker_id: string;
  ordinal: number;
  text: string;
  raw_text: string;
  start_time: number;
  end_time: number;
  confidence: number;
  reviewed: boolean;
  edited: boolean;
  job_id: string;
  word_index: number;
  working_text: string | null;
  speaker_index: number;
  is_filler: boolean;
  removed: boolean;
};

type SpeakerResolutionCurrentRow =
  Database["public"]["Tables"]["speaker_resolution_current"]["Row"];

interface WorkspaceSemanticLine {
  kind: "examination" | "by_line" | "colloquy" | "Q" | "A" | "parenthetical";
  label: string;
  text: string;
  sourceUtteranceIds: string[];
}

interface ExportSemanticLine {
  kind: "segment_heading" | "attribution" | "colloquy" | "qa" | "parenthetical";
  label: string;
  text: string;
}

function parseEnvFile(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const delimiterIndex = line.indexOf("=");
    if (delimiterIndex <= 0) continue;
    const key = line.slice(0, delimiterIndex).trim();
    const value = line.slice(delimiterIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    values[key] = value;
  }
  return values;
}

async function loadEnv(): Promise<Record<string, string>> {
  const values: Record<string, string> = {};
  for (const candidate of [".env", ".env.local"]) {
    const file = Bun.file(path.resolve(candidate));
    if (await file.exists()) {
      Object.assign(values, parseEnvFile(await file.text()));
    }
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
    if (word.removed) continue;
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

function buildWorkspaceSemanticLines(
  document: EditorDocument,
  record: CaseRecord,
  resolvedSpeakers: ReturnType<typeof buildResolvedSpeakerViews>,
): WorkspaceSemanticLine[] {
  const descriptors = buildWorkspaceParagraphs(document, resolvedSpeakers, record);
  const wordById = new Map(document.words.map((word) => [word.word_id, word]));
  const lines: WorkspaceSemanticLine[] = [];

  for (const utterance of document.utterances) {
    const descriptor = descriptors.get(utterance.utterance_id);
    if (!descriptor) continue;

    const text = utterance.word_ids
      .map((wordId) => wordById.get(wordId)?.text ?? "")
      .join(" ")
      .trim();

    if (descriptor.examinationHeader) {
      lines.push({
        kind: "examination",
        label: "",
        text: "EXAMINATION",
        sourceUtteranceIds: [utterance.utterance_id],
      });
    }

    if (descriptor.byLine) {
      lines.push({
        kind: "by_line",
        label: "",
        text: descriptor.byLine,
        sourceUtteranceIds: [utterance.utterance_id],
      });
    }

    lines.push({
      kind: descriptor.mode,
      label: descriptor.label,
      text,
      sourceUtteranceIds: [utterance.utterance_id],
    });
  }

  return lines;
}

function buildExportSemanticLines(
  transcript: TranscriptRow,
  caseRecord: CaseRecord,
  document: EditorDocument,
  speakers: TranscriptSpeakerRow[],
  utterances: TranscriptUtteranceRow[],
  words: TranscriptWordRow[],
): ExportSemanticLine[] {
  const paragraphSpecs = buildStageSDocxParagraphSpecs([{
    transcriptId: transcript.transcript_id,
    sequenceIndex: transcript.sequence_index ?? 0,
    sourceFilename: transcript.source_filename ?? null,
    document,
    snapshot: {
      job: transcript as never,
      speakers: speakers as never,
      utterances: utterances as never,
      words: words as never,
      speakerResolutionOverlay: [] as never,
    },
  } satisfies ExportTranscriptSegment], caseRecord);

  return paragraphSpecs.map((spec) => {
    if (spec.kind === "qa") {
      const label = spec.runs[0]?.kind === "text" ? spec.runs[0].text : "";
      const text = spec.runs[2]?.kind === "text" ? spec.runs[2].text : "";
      return { kind: "qa", label, text };
    }

    if (spec.kind === "colloquy") {
      const labelRun = spec.runs[0]?.kind === "text" ? spec.runs[0].text : "";
      const textRun = spec.runs[2]?.kind === "text" ? spec.runs[2].text : "";
      return {
        kind: "colloquy",
        label: labelRun.replace(/:+$/, ""),
        text: textRun,
      };
    }

    const text = spec.runs
      .filter((run): run is Extract<typeof run, { kind: "text" }> => run.kind === "text")
      .map((run) => run.text)
      .join("");

    return {
      kind: spec.kind,
      label: "",
      text,
    };
  });
}

function lineSignature(line: WorkspaceSemanticLine | ExportSemanticLine): string {
  return `${line.kind}|${line.label}|${line.text}`;
}

function countBy<T extends string>(values: T[]): Record<T, number> {
  const result = {} as Record<T, number>;
  for (const value of values) {
    result[value] = (result[value] ?? 0) + 1;
  }
  return result;
}

function formatCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key, value]) => `  - ${key}: ${value}`)
    .join("\n");
}

function truncate(value: string, max = 120): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

async function main() {
  const env = await loadEnv();
  const databaseUrl = env.DIRECT_URL || env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DIRECT_URL or DATABASE_URL is required in .env/.env.local for this audit.");
  }

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

    const [caseRows, speakers, utterances, words, overlay] = await Promise.all([
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
      sql<SpeakerResolutionCurrentRow[]>`
        select *
        from speaker_resolution_current
        where transcript_id = ${transcript.transcript_id}
        order by raw_speaker_index asc
      `,
    ]);

    const caseRow = caseRows[0];
    if (!caseRow) {
      throw new Error(`Case ${transcript.case_id} not found.`);
    }

    const record = normalizeCaseRecord(caseRow.payload) as CaseRecord;
    const document = buildEditorDocument(transcript, speakers, utterances, words);
    const resolvedSpeakers = buildResolvedSpeakerViews(speakers as never, overlay);

    const workspaceLines = buildWorkspaceSemanticLines(document, record, resolvedSpeakers);
    const exportLines = buildExportSemanticLines(transcript, record, document, speakers, utterances, words);

    const joinedWordTextByUtterance = new Map(
      document.utterances.map((utterance) => [
        utterance.utterance_id,
        utterance.word_ids
          .map((wordId) => document.words.find((word) => word.word_id === wordId)?.text ?? "")
          .join(" ")
          .trim(),
      ]),
    );

    const utteranceTextMismatches = utterances
      .map((utterance) => ({
        utteranceId: utterance.utterance_id,
        rowText: utterance.text.trim(),
        workspaceText: joinedWordTextByUtterance.get(utterance.utterance_id) ?? "",
      }))
      .filter((entry) => entry.rowText !== entry.workspaceText);

    const firstLineDivergenceIndex = Math.min(workspaceLines.length, exportLines.length);
    let divergenceIndex = -1;
    for (let index = 0; index < Math.min(workspaceLines.length, exportLines.length); index += 1) {
      if (lineSignature(workspaceLines[index]) !== lineSignature(exportLines[index])) {
        divergenceIndex = index;
        break;
      }
    }
    if (divergenceIndex === -1 && workspaceLines.length !== exportLines.length) {
      divergenceIndex = firstLineDivergenceIndex;
    }

    const workspaceKinds = countBy(workspaceLines.map((line) => line.kind));
    const exportKinds = countBy(exportLines.map((line) => line.kind));
    const workspaceLabels = countBy(workspaceLines.filter((line) => line.label).map((line) => line.label));
    const exportLabels = countBy(exportLines.filter((line) => line.label).map((line) => line.label));

    const report = `# TRANSCRIPT SOURCE OF TRUTH AUDIT

## Scope

- Transcript: \`${TRANSCRIPT_ID}\`
- Case: \`${transcript.case_id}\`
- Job: \`${transcript.job_id}\`
- Mode: Read-only audit
- Goal: prove how the workspace render path differs from the export path for the same transcript ID

## Executive Summary

- The workspace and export paths read the **same transcript family of rows** for this transcript:
  - \`transcript_speakers\`
  - \`transcript_utterances\`
  - \`transcript_words\`
- They do **not** use the same representation after load.
- The first structural split is:
  - Workspace: \`EditorDocument -> buildEditorContent(...) -> buildWorkspaceParagraphs(...)\`
  - Export: \`snapshot rows -> buildStageSDocxParagraphSpecs(...) -> renderStageS(...)\`
- The first text-source split is:
  - Workspace text comes from word-level \`working_text ?? raw_text\`
  - Export text comes from persisted \`transcript_utterances.text\` when a snapshot is present

## Question 1

### Do both paths read the same transcript rows?

Yes, at the storage layer.

- Workspace loads snapshot rows through:
  - [loadTranscriptSnapshot](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/transcriptRepository.ts:312)
  - [buildEditorDocumentFromSnapshot](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:124)
- Export screen loads ordered snapshots through:
  - [loadOrderedTranscriptSnapshotsForCase](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/transcriptRepository.ts:303)
  - [buildEditorDocumentFromSnapshot](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/ExportScreen/ExportScreen.tsx:350)

For \`${TRANSCRIPT_ID}\`, the audited persisted counts are:

- speakers: ${speakers.length}
- utterances: ${utterances.length}
- words: ${words.filter((word) => !word.removed).length}
- overlay rows: ${overlay.length}
- transcript row metadata:
  - transcripts.utterance_count: ${transcript.utterance_count}
  - transcripts.word_count: ${transcript.word_count}
  - transcripts.speaker_count: ${transcript.speaker_count}

## Question 2

### Does workspace use \`working_text\` while export uses \`text\`?

Yes.

- Workspace document words are built from:
  - [workspaceService.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:151)
  - \`text: word.working_text ?? word.raw_text\`
- Export Stage S utterances are built from snapshot utterance rows:
  - [exportDocx.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/ExportScreen/exportDocx.ts:81)
  - \`text: utterance.text\`

Measured on this transcript:

- utterance row text mismatches vs joined workspace word text: ${utteranceTextMismatches.length}

First 10 mismatches:
${utteranceTextMismatches.length === 0 ? "- none" : utteranceTextMismatches.slice(0, 10).map((entry) => `- \`${entry.utteranceId}\`
  - utterance row: ${truncate(entry.rowText)}
  - workspace words: ${truncate(entry.workspaceText)}`).join("\n")}

## Question 3

### For speaker transformations such as \`THE REPORTER:\` or \`MR. THOMAS:\`, which path contains the transformation?

Both paths perform transformations, but they do it **differently**.

- Workspace speaker/paragraph rendering:
  - [buildEditorContent](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts:14)
  - [buildWorkspaceParagraphs](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts:32)
  - [buildTranscriptSpeakerIdentityMap](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/speakerIdentity.ts:31)
- Export speaker/paragraph rendering:
  - [buildStageSDocxParagraphSpecs](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/ExportScreen/exportDocx.ts:55)
  - [renderStageS](/abs/path/C:/Users/james/Projects/Depo-Pro/src/editor/stageS/renderer.ts:33)

This means identity and formatting are currently duplicated:

- Workspace labels are derived from workspace identity + paragraph classification
- Export labels are derived from Stage S participant mapping + Stage S line rendering

## Question 4

### Count differences

Workspace semantic line count: ${workspaceLines.length}
Export semantic line count: ${exportLines.length}
Persisted utterance row count: ${utterances.length}

Workspace kinds:
${formatCounts(workspaceKinds)}

Export kinds:
${formatCounts(exportKinds)}

Workspace top labels:
${formatCounts(Object.fromEntries(Object.entries(workspaceLabels).slice(0, 12)))}

Export top labels:
${formatCounts(Object.fromEntries(Object.entries(exportLabels).slice(0, 12)))}

First divergence index: ${divergenceIndex >= 0 ? divergenceIndex : "none"}
${divergenceIndex >= 0 ? `
Workspace at divergence:
- ${truncate(lineSignature(workspaceLines[divergenceIndex] ?? { kind: "missing", label: "", text: "" } as WorkspaceSemanticLine), 220)}

Export at divergence:
- ${truncate(lineSignature(exportLines[divergenceIndex] ?? { kind: "missing", label: "", text: "" } as ExportSemanticLine), 220)}
` : ""}

First 20 workspace semantic lines:
${workspaceLines.slice(0, 20).map((line, index) => `${index + 1}. ${truncate(lineSignature(line), 220)}`).join("\n")}

First 20 export semantic lines:
${exportLines.slice(0, 20).map((line, index) => `${index + 1}. ${truncate(lineSignature(line), 220)}`).join("\n")}

## Findings

### Proven Facts

- The same transcript ID is being loaded from the same persisted transcript tables.
- The workspace and export paths do not share one paragraph engine.
- The workspace path is word-driven after load.
- The export Stage S path is utterance-row-driven after load.
- This transcript currently has ${utteranceTextMismatches.length} utterance-level text mismatches between \`transcript_utterances.text\` and the workspace word-joined text.

### Implication

The mismatch between screenshots and the exported DOCX is explained by architecture, not by the presence of two different transcript IDs. The system currently has **one transcript record with two downstream formatting engines**.

## Recommendation

Do not build more transcript-format engines on top of this split.

Choose one canonical transcript representation for:

- workspace
- DOCX export
- future PDF export
- certification view
- Q/A reconstruction
- transcript geometry

Single next architectural task:

- **Unify workspace and export on one transcript paragraph model**

Only after that should the next engine be built, likely:

- Q/A Reconstruction Engine
`;

    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, report, "utf8");
    console.log(JSON.stringify({
      transcriptId: TRANSCRIPT_ID,
      outputPath: OUTPUT_PATH,
      utteranceTextMismatchCount: utteranceTextMismatches.length,
      workspaceLineCount: workspaceLines.length,
      exportLineCount: exportLines.length,
      divergenceIndex,
    }, null, 2));
  } finally {
    await sql.close();
  }
}

await main();
