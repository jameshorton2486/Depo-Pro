import { describe, expect, it } from "vitest";

import { buildStructuredTranscriptGeometryLayout } from "../transcript/geometryEngine";
import { applyEditorialRulesToRenderModel } from "../transcript/editorialEngine";
import { buildStructuredTranscriptPackage } from "../transcript/structuredTranscriptPackage";
import type { TranscriptParagraph } from "../transcript/transcriptParagraphTypes";
import { buildUnifiedRenderModel, renderTxt, type UnifiedRenderModel } from "../transcript/unifiedRendering";

import { applyStageSPresentationRepairs } from "./deterministicRepairs";
import { runStageSValidation } from "./validationEngine";

/**
 * Ownership invariant: Stage S may READ upstream owner outputs but must never
 * MUTATE them. This test deep-freezes a UnifiedRenderModel and runs the full
 * Stage S pass over it. A frozen object throws on any write in strict mode
 * (ES modules are strict), so a silent mutation cannot pass unnoticed.
 */

function paragraph(kind: TranscriptParagraph["kind"], label: string, text: string, utteranceId: string): TranscriptParagraph {
  return {
    kind,
    region: "TESTIMONY",
    label,
    speakerLabel: "",
    text,
    speakerId: null,
    leadingText: "",
    mode: "display",
    words: [],
    sourceLines: [],
    sourceUtteranceIds: [utteranceId],
    sourceWordIds: [],
  };
}

function buildModel(): UnifiedRenderModel {
  const transcriptPackage = buildStructuredTranscriptPackage({
    transcriptId: "immutability-model",
    createdAt: "2026-07-21T00:00:00.000Z",
    dialogue: [],
    paragraphs: [
      paragraph("SECTION_HEADER", "", "EXAMINATION", "utt_1"),
      paragraph("Q", "Q.", "Please state your name.", "utt_2"),
      paragraph("A", "A.", "Alex Morgan.", "utt_3"),
    ],
  });
  return buildUnifiedRenderModel({
    transcriptPackage,
    geometry: buildStructuredTranscriptGeometryLayout(transcriptPackage),
    entityRegistry: null,
  });
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

describe("stage S upstream immutability", () => {
  it("does not mutate a deep-frozen render model during the full validation pass", () => {
    const model = buildModel();
    const before = structuredClone(model);
    deepFreeze(model);

    expect(() =>
      runStageSValidation({ name: "frozen", description: "frozen model", model }, { now: "2026-07-21T00:00:00.000Z" }),
    ).not.toThrow();

    expect(model).toEqual(before);
  });

  it("returns a NEW model from the editorial cross-check, leaving the input untouched", () => {
    const model = buildModel();
    const before = structuredClone(model);
    deepFreeze(model);

    const editorial = applyEditorialRulesToRenderModel(model);
    expect(editorial.model).not.toBe(model);
    expect(editorial.model.lines).not.toBe(model.lines);
    expect(model).toEqual(before);
  });

  it("applies presentation repairs only to the TXT string, never to a model", () => {
    const model = buildModel();
    const before = structuredClone(model);
    deepFreeze(model);

    const repaired = applyStageSPresentationRepairs(renderTxt(model).content);
    expect(typeof repaired.text).toBe("string");
    // The model is never passed to the repair function and is unchanged.
    expect(model).toEqual(before);
  });
});
