import { describe, expect, it } from "vitest";

import { buildAudioPreAnalysisReport } from "./audioPreAnalysis";

function buildAudio(overrides?: Partial<Parameters<typeof buildAudioPreAnalysisReport>[0]>) {
  return {
    audio_id: "audio_001",
    original_filename: "test-audio.m4a",
    file_size_bytes: 60_000_000,
    mime_type: "audio/mp4",
    duration_seconds: 3600,
    ...overrides,
  };
}

describe("buildAudioPreAnalysisReport", () => {
  it("emits a low bitrate warning when bitrate is below 32kbps", () => {
    const report = buildAudioPreAnalysisReport(buildAudio({
      file_size_bytes: 7_000_000,
      duration_seconds: 3600,
    }));

    expect(report.risks.some((risk) => risk.code === "LOW_BITRATE")).toBe(true);
    expect(report.gate_action).toBe("warn_proceed");
  });

  it("blocks on near-zero duration audio", () => {
    const report = buildAudioPreAnalysisReport(buildAudio({
      duration_seconds: 5,
    }));

    expect(report.risks.some((risk) => risk.code === "ZERO_DURATION")).toBe(true);
    expect(report.gate_action).toBe("block");
  });

  it("recommends chunking for files over 75 minutes", () => {
    const report = buildAudioPreAnalysisReport(buildAudio({
      duration_seconds: 5000,
    }));

    expect(report.risks.some((risk) => risk.code === "LONG_FILE")).toBe(true);
    expect(report.chunking_recommended).toBe(true);
    expect(report.chunk_count_estimate).toBe(2);
  });

  it("blocks on unsupported formats", () => {
    const report = buildAudioPreAnalysisReport(buildAudio({
      mime_type: "application/octet-stream",
    }));

    expect(report.risks.some((risk) => risk.code === "UNSUPPORTED_FORMAT")).toBe(true);
    expect(report.gate_action).toBe("block");
  });

  it("proceeds for clean known-format audio with good duration and bitrate", () => {
    const report = buildAudioPreAnalysisReport(buildAudio({
      file_size_bytes: 40_000_000,
      duration_seconds: 2400,
      mime_type: "audio/mp4",
    }));

    expect(report.risks).toEqual([]);
    expect(report.gate_action).toBe("proceed");
    expect(report.estimated_quality).toBe("high");
    expect(report.keyterms_source).toBe("case_record");
  });

  it("requires confirmation when duration is unknown", () => {
    const report = buildAudioPreAnalysisReport(buildAudio({
      duration_seconds: null,
    }));

    expect(report.risks.some((risk) => risk.code === "DURATION_UNKNOWN")).toBe(true);
    expect(report.gate_action).toBe("confirm_required");
  });

  it("accepts case-record keyterm recommendations", () => {
    const report = buildAudioPreAnalysisReport(buildAudio({
      recommended_keyterms: ["Dennis Bentley", "Bentley"],
      keyterms_source: "case_record",
    }));

    expect(report.recommended_keyterms).toEqual(["Dennis Bentley", "Bentley"]);
    expect(report.keyterms_source).toBe("case_record");
  });
});
