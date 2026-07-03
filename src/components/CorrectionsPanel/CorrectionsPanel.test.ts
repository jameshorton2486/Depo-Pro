import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CorrectionsPanel,
} from "./CorrectionsPanel";
import {
  buildRetranscriptionClipboardText,
  copyRetranscriptionKeyterms,
} from "./CorrectionsPanel.helpers";
import type { CorrectionReport } from "../../lib/transcript/correctionOrchestrator";

const mockUseDocument = vi.fn();

vi.mock("../../context/DocumentContext", () => ({
  useDocument: () => mockUseDocument(),
}));

function makeReport(
  overrides: Partial<CorrectionReport> = {},
): CorrectionReport {
  return {
    job_id: "job-1",
    generated_at: "2026-06-26T12:00:00.000Z",
    summary: {
      total_words: 100,
      deterministic_corrections_applied: 5,
      ambiguous_flags: 2,
      low_confidence_words: 3,
      implausible_money_flags: 1,
      speaker_issues: 1,
      retranscription_candidates: 3,
    },
    deterministic_corrections: [
      {
        layer: "DETERMINISTIC",
        raw_token: "scroiliac",
        corrected_token: "sacroiliac",
        description: "ASR garble of sacroiliac joint",
        word_id: "w1",
        start_time: 1,
        utterance_id: "u1",
      },
    ],
    ambiguous_flags: [
      {
        layer: "AMBIGUOUS_FLAG",
        raw_token: "accent",
        description: "Audio verification required",
        likely_meaning: "accident",
        word_id: "w2",
        start_time: 2,
        utterance_id: "u1",
        confidence: 0.8,
      },
      {
        layer: "AMBIGUOUS_FLAG",
        raw_token: "raiding",
        description: "Audio verification required",
        likely_meaning: "radiating",
        word_id: "w3",
        start_time: 3,
        utterance_id: "u1",
        confidence: 0.8,
      },
    ],
    low_confidence: [
      {
        layer: "LOW_CONFIDENCE",
        raw_token: "trauma",
        description: "Low ASR confidence",
        word_id: "w4",
        start_time: 4,
        utterance_id: "u2",
        confidence: 0.45,
      },
    ],
    implausible_money: [
      {
        layer: "IMPLAUSIBLE_MONEY",
        raw_token: "$7.50",
        description: "Possible decimal-shift ASR error",
        word_id: "w5",
        start_time: 5,
        utterance_id: "u3",
      },
    ],
    speaker_issues: [
      {
        speaker_id: "spk1",
        current_display_name: "SPEAKER 0",
        description: "Generic speaker label",
        utterance_count: 4,
      },
    ],
    retranscription_candidates: [
      {
        keyterm: "Rocio Laura Elizondo Vargas",
        reason: "Witness name garble",
        occurrence_count: 2,
      },
      {
        keyterm: "sacroiliac",
        reason: "Medical term garble",
        occurrence_count: 1,
      },
      {
        keyterm: "Eur Spine J",
        reason: "Journal abbreviation garble",
        occurrence_count: 1,
      },
    ],
    ...overrides,
  };
}

function renderWithReport(report: CorrectionReport | null): string {
  mockUseDocument.mockReturnValue({
    state: {
      correctionReport: report,
    },
  });

  return renderToStaticMarkup(React.createElement(CorrectionsPanel));
}

describe("CorrectionsPanel", () => {
  beforeEach(() => {
    mockUseDocument.mockReset();
  });

  it("renders placeholder with no report", () => {
    const html = renderWithReport(null);
    expect(html).toContain("Load a transcript to see the correction report.");
  });

  it("shows summary counts", () => {
    const html = renderWithReport(makeReport());
    expect(html).toContain("Report Summary");
    expect(html).toContain(">100<");
    expect(html).toContain(">5<");
    expect(html).toContain(">3<");
    expect(html).toContain("1 WARN");
  });

  it("shows retranscription section when candidates exist", () => {
    const html = renderWithReport(makeReport());
    expect(html).toContain("Retranscription recommended");
    expect(html).toContain("3 keyterms");
  });

  it("copies keyterms to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText } },
      configurable: true,
    });

    await copyRetranscriptionKeyterms(makeReport().retranscription_candidates);

    expect(writeText).toHaveBeenCalledWith(
      "Rocio Laura Elizondo Vargas\nsacroiliac\nEur Spine J",
    );
  });

  it("shows ambiguous flags with likely meaning", () => {
    const html = renderWithReport(makeReport());
    expect(html).toContain("Needs Audio Verification");
    expect(html).toContain("accent");
    expect(html).toContain("accident");
  });

  it("keeps deterministic section collapsed by default", () => {
    const html = renderWithReport(makeReport());
    expect(html).toContain("Auto-corrected");
    expect(html).not.toContain("ASR garble of sacroiliac joint");
  });

  it("shows speaker issue fix hint", () => {
    const html = renderWithReport(makeReport());
    expect(html).toContain("Speaker Issues");
    expect(html).toContain("Fix in Speakers tab");
  });

  it("shows success state for a clean transcript", () => {
    const html = renderWithReport(
      makeReport({
        summary: {
          total_words: 25,
          deterministic_corrections_applied: 0,
          ambiguous_flags: 0,
          low_confidence_words: 0,
          implausible_money_flags: 0,
          speaker_issues: 0,
          retranscription_candidates: 0,
        },
        deterministic_corrections: [],
        ambiguous_flags: [],
        low_confidence: [],
        implausible_money: [],
        speaker_issues: [],
        retranscription_candidates: [],
      }),
    );

    expect(html).toContain("No issues found");
    expect(html).toContain("Ready for review.");
  });
});

describe("buildRetranscriptionClipboardText", () => {
  it("joins keyterms with newlines", () => {
    expect(
      buildRetranscriptionClipboardText(makeReport().retranscription_candidates),
    ).toBe("Rocio Laura Elizondo Vargas\nsacroiliac\nEur Spine J");
  });
});
