import { describe, expect, it } from "vitest";

import type { NormalizedTranscriptData } from "./normalize";
import {
  buildSegmentTranscriptBundle,
  replaceCaseSegmentTranscripts,
  type SegmentTranscriptBundle,
  type SegmentTranscriptStore,
} from "./segmentFinalization";

function buildNormalized(seed: number): NormalizedTranscriptData {
  return {
    durationSeconds: 12 + seed,
    avgConfidence: 0.91,
    speakers: [{
      speaker_id: `spk_${seed}`,
      speaker_index: seed,
      speaker_label: `Speaker ${seed}`,
      assigned_name: null,
      speaker_role: null,
      word_count: 2,
    }],
    utterances: [{
      utterance_id: `utt_${seed}`,
      utterance_index: 0,
      speaker_id: `spk_${seed}`,
      speaker_index: seed,
      speaker_label: `Speaker ${seed}`,
      start_time: 0,
      end_time: 2,
      text: `segment ${seed}`,
      avg_confidence: 0.91,
    }],
    words: [
      {
        word_id: `w_${seed}_0`,
        utterance_id: `utt_${seed}`,
        word_index: 0,
        raw_text: "segment",
        working_text: null,
        speaker_id: `spk_${seed}`,
        speaker_index: seed,
        start_time: 0,
        end_time: 1,
        confidence: 0.9,
        is_filler: false,
        reviewed: false,
        edited: false,
      },
      {
        word_id: `w_${seed}_1`,
        utterance_id: `utt_${seed}`,
        word_index: 1,
        raw_text: String(seed),
        working_text: null,
        speaker_id: `spk_${seed}`,
        speaker_index: seed,
        start_time: 1,
        end_time: 2,
        confidence: 0.92,
        is_filler: false,
        reviewed: false,
        edited: false,
      },
    ],
  };
}

function buildBundle(sourceIndex: number): SegmentTranscriptBundle {
  return buildSegmentTranscriptBundle({
    transcriptId: "tr_base",
    caseId: "case_001",
    jobId: "job_001",
    ownerUserId: "user_001",
  }, {
    sourceAudioId: `audio_${sourceIndex}`,
    sourceIndex,
    sourceFilename: `source_${sourceIndex + 1}.mp3`,
    mimeType: "audio/mpeg",
    storagePath: `storage/source_${sourceIndex + 1}.mp3`,
    mediaUrl: null,
    normalized: buildNormalized(sourceIndex),
    deepgramRequestId: `dg_${sourceIndex}`,
    rawStoragePath: `artifacts/source_${sourceIndex + 1}.json`,
    rawChecksum: null,
  });
}

describe("buildSegmentTranscriptBundle", () => {
  it("builds one transcript bundle per source with sequence_index equal to source_index", () => {
    const bundles = [buildBundle(0), buildBundle(1), buildBundle(2)];

    expect(bundles.map((bundle) => bundle.transcript.sequence_index)).toEqual([0, 1, 2]);
    expect(bundles.map((bundle) => bundle.transcript.transcript_id)).toEqual([
      "tr_base_seg_000",
      "tr_base_seg_001",
      "tr_base_seg_002",
    ]);
    expect(bundles.every((bundle) => bundle.transcript.job_id !== "job_001")).toBe(true);
    expect(bundles.some((bundle) => bundle.transcript.transcript_id === "tr_base")).toBe(false);
  });
});

class MemorySegmentStore implements SegmentTranscriptStore {
  transcriptIdsByCase = new Map<string, string[]>();
  inserted: SegmentTranscriptBundle[] = [];

  constructor(existingTranscriptIds: string[] = []) {
    this.transcriptIdsByCase.set("case_001", existingTranscriptIds);
  }

  async listCaseTranscriptIds(caseId: string): Promise<string[]> {
    return [...(this.transcriptIdsByCase.get(caseId) ?? [])];
  }

  async deleteTranscriptData(transcriptId: string): Promise<void> {
    for (const [caseId, transcriptIds] of this.transcriptIdsByCase.entries()) {
      this.transcriptIdsByCase.set(caseId, transcriptIds.filter((value) => value !== transcriptId));
    }
    this.inserted = this.inserted.filter((bundle) => bundle.transcript.transcript_id !== transcriptId);
  }

  async insertTranscriptBundle(bundle: SegmentTranscriptBundle): Promise<void> {
    const transcriptIds = this.transcriptIdsByCase.get(bundle.transcript.case_id) ?? [];
    transcriptIds.push(bundle.transcript.transcript_id);
    this.transcriptIdsByCase.set(bundle.transcript.case_id, transcriptIds);
    this.inserted.push(bundle);
  }
}

describe("replaceCaseSegmentTranscripts", () => {
  it("replaces prior segment rows instead of accumulating them on rerun", async () => {
    const store = new MemorySegmentStore(["tr_base_seg_000", "tr_base_seg_001"]);

    await replaceCaseSegmentTranscripts(store, "case_001", [
      buildBundle(0),
      buildBundle(1),
      buildBundle(2),
    ]);

    expect(store.transcriptIdsByCase.get("case_001")).toEqual([
      "tr_base_seg_000",
      "tr_base_seg_001",
      "tr_base_seg_002",
    ]);
    expect(store.inserted).toHaveLength(3);
  });
});
