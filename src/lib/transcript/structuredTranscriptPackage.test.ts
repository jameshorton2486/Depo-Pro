import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../../api/types";
import {
  BOUNDARY_SEMANTIC_PRODUCER,
  PARAGRAPH_SEMANTIC_PRODUCER,
  SPEAKER_SEMANTIC_PRODUCER,
  STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER,
  STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA,
  STRUCTURED_TRANSCRIPT_PACKAGE_VERSION,
  buildStructuredTranscriptPackage,
  createStructuredTranscriptPackageSkeleton,
  validateStructuredTranscriptPackageContract,
} from "./structuredTranscriptPackage";

function makeDocument(): EditorDocument {
  return {
    job_id: "job-structured-1",
    media_url: "https://example.test/audio.wav",
    duration: 12,
    speakers: [
      {
        speaker_id: "spk-1",
        display_name: "MR. SMITH",
        deepgram_speaker: 0,
        role: "ATTORNEY",
      },
      {
        speaker_id: "spk-2",
        display_name: "THE WITNESS",
        deepgram_speaker: 1,
        role: "WITNESS",
      },
    ],
    utterances: [
      {
        utterance_id: "utt-1",
        speaker_id: "spk-1",
        start_time: 0,
        end_time: 2,
        word_ids: ["w-1", "w-2", "w-3", "w-4", "w-5"],
      },
      {
        utterance_id: "utt-2",
        speaker_id: "spk-2",
        start_time: 2,
        end_time: 4,
        word_ids: ["w-6", "w-7", "w-8", "w-9"],
      },
    ],
    words: [
      { word_id: "w-1", text: "What", raw_text: "What", speaker_id: "spk-1", utterance_id: "utt-1", start_time: 0, end_time: 0.3, confidence: 0.99, reviewed: true, edited: false },
      { word_id: "w-2", text: "is", raw_text: "is", speaker_id: "spk-1", utterance_id: "utt-1", start_time: 0.3, end_time: 0.5, confidence: 0.98, reviewed: true, edited: false },
      { word_id: "w-3", text: "your", raw_text: "your", speaker_id: "spk-1", utterance_id: "utt-1", start_time: 0.5, end_time: 0.7, confidence: 0.97, reviewed: true, edited: false },
      { word_id: "w-4", text: "name", raw_text: "name", speaker_id: "spk-1", utterance_id: "utt-1", start_time: 0.7, end_time: 0.9, confidence: 0.96, reviewed: true, edited: false },
      { word_id: "w-5", text: "?", raw_text: "?", speaker_id: "spk-1", utterance_id: "utt-1", start_time: 0.9, end_time: 1.0, confidence: 0.95, reviewed: true, edited: false },
      { word_id: "w-6", text: "John", raw_text: "John", speaker_id: "spk-2", utterance_id: "utt-2", start_time: 2.0, end_time: 2.2, confidence: 0.84, reviewed: false, edited: false },
      { word_id: "w-7", text: "Doe", raw_text: "Doe", speaker_id: "spk-2", utterance_id: "utt-2", start_time: 2.2, end_time: 2.4, confidence: 0.83, reviewed: false, edited: false },
      { word_id: "w-8", text: ".", raw_text: ".", speaker_id: "spk-2", utterance_id: "utt-2", start_time: 2.4, end_time: 2.5, confidence: 0.82, reviewed: false, edited: false },
      { word_id: "w-9", text: "", raw_text: "", speaker_id: "spk-2", utterance_id: "utt-2", start_time: 2.5, end_time: 2.6, confidence: 0.81, reviewed: false, edited: false },
    ],
  };
}

describe("structuredTranscriptPackage contract", () => {
  it("creates an explicit package skeleton with canonical identity fields", () => {
    const structuredTranscript = createStructuredTranscriptPackageSkeleton("job-skeleton-1");

    expect(structuredTranscript.version).toBe(STRUCTURED_TRANSCRIPT_PACKAGE_VERSION);
    expect(structuredTranscript.schemaVersion).toBe(1);
    expect(structuredTranscript.producerVersion).toBe(1);
    expect(structuredTranscript.producerVersions).toEqual({
      contract: 1,
      speakerSemantics: 1,
      paragraphSemantics: 1,
      boundarySemantics: 1,
    });
    expect(structuredTranscript.canonicalTranscriptId).toBe("job-skeleton-1");
    expect(Date.parse(structuredTranscript.createdAt)).not.toBeNaN();
    expect(structuredTranscript.identity).toEqual({
      schema: STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA,
      version: STRUCTURED_TRANSCRIPT_PACKAGE_VERSION,
      producer: STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER,
      builtAt: structuredTranscript.identity.builtAt,
      transcriptId: "job-skeleton-1",
    });
    expect(Date.parse(structuredTranscript.identity.builtAt)).not.toBeNaN();
    expect(structuredTranscript.speakers).toEqual([]);
    expect(structuredTranscript.resolvedSpeakers).toEqual([]);
    expect(structuredTranscript.paragraphs).toEqual([]);
    expect(structuredTranscript.lineTypes).toEqual([]);
    expect(structuredTranscript.provenance).toEqual([]);
    expect(structuredTranscript.reviewFlags).toEqual([]);
    expect(validateStructuredTranscriptPackageContract(structuredTranscript)).toEqual([]);
  });

  it("builds a package that satisfies the contract invariants", () => {
    const structuredTranscript = buildStructuredTranscriptPackage(makeDocument(), {
      mode: "clean",
    });

    expect(structuredTranscript.identity.schema).toBe(STRUCTURED_TRANSCRIPT_PACKAGE_SCHEMA);
    expect(structuredTranscript.identity.version).toBe(STRUCTURED_TRANSCRIPT_PACKAGE_VERSION);
    expect(structuredTranscript.identity.producer).toBe(STRUCTURED_TRANSCRIPT_PACKAGE_PRODUCER);
    expect(structuredTranscript.identity.transcriptId).toBe("job-structured-1");
    expect(structuredTranscript.canonicalTranscriptId).toBe("job-structured-1");
    expect(structuredTranscript.speakers.length).toBe(2);
    expect(structuredTranscript.resolvedSpeakers).toEqual(structuredTranscript.speakers);
    expect(structuredTranscript.paragraphs.length).toBeGreaterThan(0);
    expect(structuredTranscript.lineTypes).toHaveLength(structuredTranscript.paragraphs.length);
    expect(structuredTranscript.provenance).toHaveLength(structuredTranscript.paragraphs.length);
    expect(structuredTranscript.reviewFlags).toHaveLength(structuredTranscript.paragraphs.length);
    expect(structuredTranscript.paragraphs.every((paragraph) => paragraph.speakerId !== null)).toBe(true);
    expect(structuredTranscript.paragraphs.every((paragraph) => paragraph.line_type === paragraph.lineType)).toBe(true);
    expect(structuredTranscript.paragraphs.every((paragraph) => (
      paragraph.provenance.semanticOwners.speakerLabel === SPEAKER_SEMANTIC_PRODUCER
      && paragraph.provenance.semanticOwners.lineType === PARAGRAPH_SEMANTIC_PRODUCER
    ))).toBe(true);
    expect(validateStructuredTranscriptPackageContract(structuredTranscript)).toEqual([]);
  });

  it("preserves producer-owned speaker labels and line types without package fallback inference", () => {
    const structuredTranscript = buildStructuredTranscriptPackage(makeDocument(), {
      mode: "clean",
    });

    const questionParagraph = structuredTranscript.paragraphs.find((paragraph) => paragraph.kind === "Q");
    const answerParagraph = structuredTranscript.paragraphs.find((paragraph) => paragraph.kind === "A");

    expect(questionParagraph?.speakerLabel).toBe("MR. SMITH");
    expect(questionParagraph?.lineType).toBe("Q");
    expect(questionParagraph?.line_type).toBe("Q");
    expect(questionParagraph?.provenance.semanticOwners.speakerLabel).toBe(SPEAKER_SEMANTIC_PRODUCER);
    expect(questionParagraph?.provenance.semanticOwners.lineType).toBe(PARAGRAPH_SEMANTIC_PRODUCER);

    expect(answerParagraph?.speakerLabel).toBe("THE WITNESS");
    expect(answerParagraph?.lineType).toBe("A");
    expect(answerParagraph?.line_type).toBe("A");
  });

  it("stamps boundary provenance from producer-owned utterance metadata without regenerating it", () => {
    const doc = makeDocument();
    const boundaryAwareDoc = {
      ...doc,
      utterances: [
        {
          ...doc.utterances[0],
          excluded_from_output: true,
          exclusion_reason: "OFF_RECORD",
          is_synthetic: true,
        },
        ...doc.utterances.slice(1),
      ],
    } as typeof doc & {
      utterances: Array<typeof doc.utterances[number] & {
        excluded_from_output?: boolean;
        exclusion_reason?: "PRE_RECORD" | "OFF_RECORD" | "POST_RECORD" | null;
        is_synthetic?: boolean;
      }>;
    };

    const structuredTranscript = buildStructuredTranscriptPackage(boundaryAwareDoc, {
      mode: "clean",
    });
    const questionParagraph = structuredTranscript.paragraphs.find((paragraph) => paragraph.kind === "Q");

    expect(questionParagraph?.provenance.boundary).toEqual({
      producer: BOUNDARY_SEMANTIC_PRODUCER,
      excludedFromOutput: true,
      exclusionReason: "OFF_RECORD",
      isSynthetic: true,
    });
    expect(questionParagraph?.provenance.semanticOwners.boundary).toBe(BOUNDARY_SEMANTIC_PRODUCER);
  });

  it("reports duplicate ids, orphan speakers, and missing provenance", () => {
    const structuredTranscript = buildStructuredTranscriptPackage(makeDocument(), {
      mode: "clean",
    });
    const paragraph = structuredTranscript.paragraphs.find((candidate) => candidate.speakerId) ?? structuredTranscript.paragraphs[0];

    structuredTranscript.speakers = [
      structuredTranscript.speakers[0],
      { ...structuredTranscript.speakers[0] },
    ];
    structuredTranscript.paragraphs = [
      {
        ...paragraph,
        id: "dup-paragraph",
        speakerId: "missing-speaker",
        line_type: paragraph.lineType,
        sourceUtteranceIds: [],
        sourceWordIds: [],
        provenance: {
          ...paragraph.provenance,
          paragraphId: "other-paragraph",
          sourceUtteranceIds: [],
          sourceWordIds: [],
          semanticOwners: {
            ...paragraph.provenance.semanticOwners,
            speakerLabel: "invalid-speaker-owner" as typeof SPEAKER_SEMANTIC_PRODUCER,
            lineType: "invalid-line-type-owner" as typeof PARAGRAPH_SEMANTIC_PRODUCER,
          },
        },
      },
      {
        ...paragraph,
        id: "dup-paragraph",
      },
    ];
    structuredTranscript.lineTypes = [];
    structuredTranscript.provenance = [];
    structuredTranscript.reviewFlags = [];

    expect(validateStructuredTranscriptPackageContract(structuredTranscript)).toEqual(
      expect.arrayContaining([
        `duplicate speakerId: ${structuredTranscript.speakers[0].speakerId}`,
        "duplicate paragraph id: dup-paragraph",
        "paragraph dup-paragraph references orphan speakerId missing-speaker",
        "paragraph dup-paragraph must have provenance",
        "paragraph dup-paragraph provenance must reference the same paragraph id",
        `paragraph dup-paragraph must attribute speakerLabel ownership to ${SPEAKER_SEMANTIC_PRODUCER}`,
        `paragraph dup-paragraph must attribute lineType ownership to ${PARAGRAPH_SEMANTIC_PRODUCER}`,
        "paragraph dup-paragraph must have a top-level lineTypes entry",
        "paragraph dup-paragraph must have a top-level provenance entry",
        "paragraph dup-paragraph must have a top-level reviewFlags entry",
      ]),
    );
  });
});
