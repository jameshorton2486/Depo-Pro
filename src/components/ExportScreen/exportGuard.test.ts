import { describe, expect, it, vi } from "vitest";

import type { SpeakerMapConfirmationResult } from "../../api/workspaceService";
import {
  UNCONFIRMED_SPEAKER_MAP_DRAFT_BANNER,
  buildSpeakerMappingCallToAction,
  classifyExportLane,
  executeGuardedExport,
  prependDraftBanner,
} from "./exportGuard";

function buildSpeakerMapStatus(overrides: Partial<SpeakerMapConfirmationResult> = {}): SpeakerMapConfirmationResult {
  return {
    jobId: "job_123",
    transcriptId: "tr_123",
    caseId: "case_123",
    confirmed: true,
    ...overrides,
  };
}

describe("exportGuard", () => {
  it("classifies txt as draft and docx/package as certified", () => {
    expect(classifyExportLane("txt")).toBe("draft");
    expect(classifyExportLane("docx")).toBe("certified");
    expect(classifyExportLane("package")).toBe("certified");
    expect(classifyExportLane("pdf")).toBe("certified");
  });

  it("blocks certified export when the speaker map is unconfirmed", async () => {
    const produce = vi.fn(async () => "artifact");

    const result = await executeGuardedExport(
      "docx",
      buildSpeakerMapStatus({
        confirmed: false,
        message: "Speaker mapping not confirmed. Complete speaker mapping before exporting a certified transcript.",
      }),
      produce,
    );

    expect(result).toEqual({
      ok: false,
      lane: "certified",
      message: "Certified export is unavailable because speaker roles have not been confirmed.",
      cta: {
        label: "Map Speakers Now",
        transcriptId: "tr_123",
        caseId: "case_123",
        sidebarTab: "speakers",
      },
    });
    expect(produce).not.toHaveBeenCalled();
  });

  it("defaults unknown future formats to the certified blocked lane", async () => {
    const produce = vi.fn(async () => "artifact");

    const result = await executeGuardedExport(
      "pdf",
      buildSpeakerMapStatus({ confirmed: false }),
      produce,
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.lane).toBe("certified");
    expect(result.message).toBe("Certified export is unavailable because speaker roles have not been confirmed.");
    expect(produce).not.toHaveBeenCalled();
  });

  it("allows draft export and stamps it when the speaker map is unconfirmed", async () => {
    const produce = vi.fn(({ banner }: { banner: string | null }) => (
      banner ? prependDraftBanner("utt_0001 [spk_000]: Example testimony.", banner) : "plain text"
    ));

    const result = await executeGuardedExport(
      "txt",
      buildSpeakerMapStatus({ confirmed: false }),
      produce,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.lane).toBe("draft");
    expect(result.banner).toBe(UNCONFIRMED_SPEAKER_MAP_DRAFT_BANNER);
    expect(result.artifact).toContain(UNCONFIRMED_SPEAKER_MAP_DRAFT_BANNER);
    expect(produce).toHaveBeenCalledOnce();
  });

  it("lets confirmed jobs export certified output without a banner", async () => {
    const produce = vi.fn(({ banner }: { banner: string | null }) => ({
      kind: "docx",
      banner,
      paragraphCount: 12,
    }));

    const result = await executeGuardedExport(
      "docx",
      buildSpeakerMapStatus({ confirmed: true }),
      produce,
    );

    expect(result).toEqual({
      ok: true,
      lane: "certified",
      banner: null,
      artifact: {
        kind: "docx",
        banner: null,
        paragraphCount: 12,
      },
    });
    expect(produce).toHaveBeenCalledOnce();
  });

  it("builds a speaker-mapping CTA with the exact transcript identifier", () => {
    expect(buildSpeakerMappingCallToAction(buildSpeakerMapStatus({
      confirmed: false,
      transcriptId: "tr_failed_export",
      caseId: "case_failed_export",
    }))).toEqual({
      label: "Map Speakers Now",
      transcriptId: "tr_failed_export",
      caseId: "case_failed_export",
      sidebarTab: "speakers",
    });
  });
});
