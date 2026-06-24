import { describe, expect, it } from "vitest";
import { buildRetranscriptionAuditArtifact } from "./retranscription";

describe("buildRetranscriptionAuditArtifact", () => {
  it("creates an append-only retranscription audit payload", () => {
    const artifact = buildRetranscriptionAuditArtifact({
      caseId: "case_123",
      sourceAudioId: "audio_1",
      sourceTranscriptId: "tr_original",
      newTranscriptId: "tr_rerun",
      requestedAt: "2026-06-23T12:00:00.000Z",
    });

    expect(artifact).toEqual({
      kind: "retranscription_requested",
      requested_at: "2026-06-23T12:00:00.000Z",
      case_id: "case_123",
      source_audio_id: "audio_1",
      source_transcript_id: "tr_original",
      new_transcript_id: "tr_rerun",
    });
  });
});
