import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AudioPreAnalysisGate } from "./AudioPreAnalysisGate";
import type { AudioPreAnalysisReport } from "../../lib/audio/audioPreAnalysis";

type ElementWithChildren = ReactElement<{ children?: ReactNode } & Record<string, unknown>>;

function visitElements(node: ReactNode, cb: (element: ElementWithChildren) => void) {
  if (!isValidElement(node)) {
    return;
  }

  const element = node as ElementWithChildren;
  cb(element);

  const children = element.props.children;
  if (Array.isArray(children)) {
    children.forEach((child) => visitElements(child, cb));
    return;
  }

  visitElements(children, cb);
}

function findByTestId(node: ReactNode, testId: string): ElementWithChildren {
  let match: ElementWithChildren | null = null;

  visitElements(node, (element) => {
    if (element.props["data-testid"] === testId) {
      match = element;
    }
  });

  if (!match) {
    throw new Error(`Missing element with data-testid="${testId}"`);
  }

  return match;
}

function collectText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (!isValidElement(node)) {
    return "";
  }

  const element = node as ElementWithChildren;
  const children = element.props.children;
  if (Array.isArray(children)) {
    return children.map((child) => collectText(child)).join(" ");
  }
  return collectText(children);
}

function buildReport(overrides?: Partial<AudioPreAnalysisReport>): AudioPreAnalysisReport {
  return {
    audio_id: "audio_001",
    filename: "test-audio.m4a",
    file_size_bytes: 40_000_000,
    mime_type: "audio/mp4",
    duration_seconds: 2400,
    duration_source: "db_metadata",
    duration_minutes_display: "40m 0s",
    estimated_bitrate_kbps: 133.3,
    estimated_quality: "high",
    risks: [],
    overall_risk: "low",
    chunking_recommended: false,
    chunk_count_estimate: null,
    chunking_reason: null,
    recommended_keyterms: [],
    keyterms_source: "case_record",
    proceed_recommended: true,
    gate_action: "proceed",
    gate_message: "Audio analysis passed. Ready to transcribe.",
    generated_at: "2026-07-01T16:00:00.000Z",
    ...overrides,
  };
}

describe("AudioPreAnalysisGate", () => {
  it("renders the proceed state with countdown", () => {
    const tree = AudioPreAnalysisGate({
      report: buildReport(),
      countdownSeconds: 2,
      onProceed: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(isValidElement(tree)).toBe(true);
    expect(findByTestId(tree, "audio-pre-analysis-gate")).toBeTruthy();
    expect(collectText(tree)).toContain("Starting in 2s");
    expect(findByTestId(tree, "audio-pre-analysis-proceed")).toBeTruthy();
  });

  it("renders warning risks with proceed and cancel actions", () => {
    const tree = AudioPreAnalysisGate({
      report: buildReport({
        gate_action: "warn_proceed",
        gate_message: "Audio analysis found warnings. Review before proceeding.",
        risks: [{
          severity: "warning",
          code: "LOW_BITRATE",
          title: "Low audio bitrate",
          description: "Low bitrate.",
          recommendation: "Consider re-recording.",
        }],
        overall_risk: "medium",
      }),
      onProceed: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(findByTestId(tree, "audio-pre-analysis-risk-LOW_BITRATE")).toBeTruthy();
    expect(findByTestId(tree, "audio-pre-analysis-proceed")).toBeTruthy();
    expect(findByTestId(tree, "audio-pre-analysis-cancel")).toBeTruthy();
  });

  it("requires explicit confirmation for confirm_required", () => {
    const tree = AudioPreAnalysisGate({
      report: buildReport({
        gate_action: "confirm_required",
        gate_message: "Audio analysis found warnings that require confirmation before transcription starts.",
      }),
      confirmChecked: false,
      onConfirmCheckedChange: vi.fn(),
      onProceed: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(findByTestId(tree, "audio-pre-analysis-confirm-label")).toBeTruthy();
    expect(findByTestId(tree, "audio-pre-analysis-proceed").props.disabled).toBe(true);
  });

  it("blocks transcription when gate_action is block", () => {
    const tree = AudioPreAnalysisGate({
      report: buildReport({
        gate_action: "block",
        gate_message: "Unsupported format.",
        risks: [{
          severity: "critical",
          code: "UNSUPPORTED_FORMAT",
          title: "Unsupported audio format",
          description: "Unsupported format.",
          recommendation: "Convert the file.",
        }],
        proceed_recommended: false,
        overall_risk: "critical",
      }),
      onProceed: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(findByTestId(tree, "audio-pre-analysis-cancel")).toBeTruthy();
    expect(() => findByTestId(tree, "audio-pre-analysis-proceed")).toThrow();
  });
});
