import { buildStructuredTranscriptGeometryLayout } from "../transcript/geometryEngine";
import { buildStructuredTranscriptPackage } from "../transcript/structuredTranscriptPackage";
import type { DepositionRegion } from "../transcript/depositionRegionEngine";
import type { TranscriptParagraph, TranscriptParagraphKind } from "../transcript/transcriptParagraphTypes";
import { buildUnifiedRenderModel } from "../transcript/unifiedRendering";

import type { StageSFixture } from "./validationEngine";

/**
 * Release Candidate Stage S fixtures.
 *
 * Each fixture is built through the REAL owner pipeline
 * (package -> geometry -> unified render) so Stage S measures authentic
 * upstream output, never a hand-forged model. Fixtures are test data owned by
 * Stage S; no upstream owner is modified.
 */

interface ParagraphSeed {
  kind: TranscriptParagraphKind;
  text: string;
  label?: string;
  speakerLabel?: string;
  region?: DepositionRegion;
  utteranceId: string;
}

function makeParagraph(seed: ParagraphSeed): TranscriptParagraph {
  return {
    kind: seed.kind,
    region: seed.region ?? "TESTIMONY",
    label: seed.label ?? "",
    speakerLabel: seed.speakerLabel ?? "",
    text: seed.text,
    speakerId: null,
    leadingText: "",
    mode: "display",
    words: [],
    sourceLines: [],
    sourceUtteranceIds: [seed.utteranceId],
    sourceWordIds: [],
  };
}

function buildFixture(name: string, description: string, transcriptId: string, seeds: ParagraphSeed[]): StageSFixture {
  const transcriptPackage = buildStructuredTranscriptPackage({
    transcriptId,
    createdAt: "2026-07-21T00:00:00.000Z",
    dialogue: [],
    paragraphs: seeds.map(makeParagraph),
  });
  const model = buildUnifiedRenderModel({
    transcriptPackage,
    geometry: buildStructuredTranscriptGeometryLayout(transcriptPackage),
    entityRegistry: null,
  });
  return { name, description, model };
}

/** Well-formed examination — the RC quality target (expected to pass). */
const cleanExamination = buildFixture(
  "clean-examination",
  "Well-formed examination: EXAMINATION header, labeled Q/A, canonical colloquy objection, parenthetical.",
  "stage-s-clean-examination",
  [
    { kind: "SECTION_HEADER", text: "EXAMINATION", utteranceId: "utt_ce_1" },
    { kind: "Q", label: "Q.", speakerLabel: "MR. SAMPLE", text: "Please state your name for the record.", utteranceId: "utt_ce_2" },
    { kind: "A", label: "A.", speakerLabel: "THE WITNESS", text: "Alex Morgan.", utteranceId: "utt_ce_3" },
    { kind: "COLLOQUY", label: "THE COURT", text: "Objection.  Form.", utteranceId: "utt_ce_4" },
    { kind: "PARENTHETICAL", text: "(Whereupon, a recess was taken.)", region: "PROCEEDINGS", utteranceId: "utt_ce_5" },
  ],
);

/** Q/A testimony not introduced by an EXAMINATION header (MAJOR boundary repair). */
const missingExaminationHeader = buildFixture(
  "missing-examination-header",
  "Q/A testimony with no preceding EXAMINATION section header.",
  "stage-s-missing-examination-header",
  [
    { kind: "Q", label: "Q.", speakerLabel: "MR. SAMPLE", text: "Where were you on the night in question?", utteranceId: "utt_me_1" },
    { kind: "A", label: "A.", speakerLabel: "THE WITNESS", text: "At home.", utteranceId: "utt_me_2" },
  ],
);

/** An answer preceding any question (CRITICAL Q/A continuity break — expected to fail). */
const answerBeforeQuestion = buildFixture(
  "answer-before-question",
  "An answer paragraph appears before any question, breaking Q/A continuity.",
  "stage-s-answer-before-question",
  [
    { kind: "SECTION_HEADER", text: "EXAMINATION", utteranceId: "utt_ab_1" },
    { kind: "A", label: "A.", speakerLabel: "THE WITNESS", text: "Yes, that is correct.", utteranceId: "utt_ab_2" },
    { kind: "Q", label: "Q.", speakerLabel: "MR. SAMPLE", text: "Is that your signature?", utteranceId: "utt_ab_3" },
  ],
);

export const STAGE_S_RC_FIXTURES: readonly StageSFixture[] = [
  cleanExamination,
  missingExaminationHeader,
  answerBeforeQuestion,
];
