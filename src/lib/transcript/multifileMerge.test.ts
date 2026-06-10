import { describe, expect, it } from "vitest";

import { normalizeTranscriptResponse } from "./normalize";
import { createOfflineDeepgramFixture } from "./offlineFixture";
import { mergeSourceTranscriptSegments } from "./multifileMerge";

function buildSegment(caseId: string, sourceIndex: number, overrides?: {
  metadataDuration?: number;
  fallbackDurationSeconds?: number | null;
}) {
  const response = createOfflineDeepgramFixture(caseId);
  if (typeof overrides?.metadataDuration === "number") {
    response.metadata.duration = overrides.metadataDuration;
  }

  return {
    source_audio_id: `audio_${sourceIndex}`,
    source_index: sourceIndex,
    source_filename: `source_${sourceIndex + 1}.mp3`,
    mime_type: "audio/mpeg",
    storage_path: `cases/demo/audio_${sourceIndex}.mp3`,
    media_url: null,
    response,
    normalized: normalizeTranscriptResponse(response),
    fallback_duration_seconds: overrides?.fallbackDurationSeconds ?? response.metadata.duration,
  };
}

describe("mergeSourceTranscriptSegments", () => {
  it("preserves single-file normalized output exactly", () => {
    const segment = buildSegment("case_single", 0);

    const merged = mergeSourceTranscriptSegments([segment]);

    expect(merged.normalized).toEqual(segment.normalized);
    expect(merged.segments).toEqual([{
      source_audio_id: "audio_0",
      source_index: 0,
      source_filename: "source_1.mp3",
      mime_type: "audio/mpeg",
      storage_path: "cases/demo/audio_0.mp3",
      media_url: null,
      start_offset_seconds: 0,
      duration_seconds: segment.response.metadata.duration,
    }]);
  });

  it("rebases timings, maintains ordinal continuity, and namespaces speakers across files", () => {
    const first = buildSegment("case_a", 0, { metadataDuration: 6 });
    const second = buildSegment("case_b", 1, { metadataDuration: 7 });

    const merged = mergeSourceTranscriptSegments([first, second]);
    const firstWordCount = first.normalized.words.length;
    const firstUtteranceCount = first.normalized.utterances.length;

    expect(merged.normalized.words).toHaveLength(first.normalized.words.length + second.normalized.words.length);
    expect(merged.normalized.utterances).toHaveLength(first.normalized.utterances.length + second.normalized.utterances.length);
    expect(merged.normalized.speakers.map((speaker) => speaker.speaker_id)).toEqual([
      "spk_f000_s000",
      "spk_f000_s001",
      "spk_f001_s000",
      "spk_f001_s001",
    ]);
    expect(merged.normalized.words[firstWordCount].word_id).toBe(`w_${String(firstWordCount).padStart(8, "0")}`);
    expect(merged.normalized.utterances[firstUtteranceCount].utterance_id).toBe(`utt_${String(firstUtteranceCount).padStart(6, "0")}`);
    expect(merged.normalized.words[firstWordCount].start_time).toBeCloseTo(
      second.normalized.words[0].start_time + 6,
      5,
    );
    expect(merged.normalized.utterances[firstUtteranceCount].speaker_label).toBe("File 2 Speaker 0");
  });

  it("falls back to the previous file's last word end time when duration metadata is missing", () => {
    const first = buildSegment("case_duration", 0, { metadataDuration: 6 });
    const second = buildSegment("case_duration_2", 1, {
      metadataDuration: Number.NaN,
      fallbackDurationSeconds: null,
    });
    second.normalized.durationSeconds = Number.NaN;
    second.response.metadata.duration = Number.NaN;

    const merged = mergeSourceTranscriptSegments([first, second]);
    const secondSegment = merged.segments[1];
    const expectedDuration = second.normalized.words[second.normalized.words.length - 1].end_time;

    expect(secondSegment.duration_seconds).toBeCloseTo(expectedDuration, 5);
    expect(merged.normalized.durationSeconds).toBeCloseTo(6 + expectedDuration, 5);
  });
});
