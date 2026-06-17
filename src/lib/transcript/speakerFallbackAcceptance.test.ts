import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../../api/types";
import { normalizeTranscriptResponse } from "./normalize";
import type { ResolvedSpeakerView } from "./resolvedSpeakers";
import {
  buildTranscriptSpeakerIdentityMap,
  buildUnresolvedSpeakerLabel,
  isUnresolvedSpeakerLabel,
} from "./speakerIdentity";

interface LabelCounts {
  correct: number;
  incorrect: number;
  unmapped: number;
}

const CERTIFIED_LABELS = new Map<number, string>([
  [0, "THE REPORTER"],
  [1, "MR. THOMAS"],
  [2, "MR. NUNEZ"],
]);

const LEGACY_COUNTS: LabelCounts = {
  correct: 3,
  incorrect: 5,
  unmapped: 0,
};

function loadHeathThomasFixture() {
  const fixturePath = resolve(
    process.cwd(),
    "docs/audits/fixtures/tr_1781456706021_4bdiwu_deepgram_response.json",
  );
  return JSON.parse(readFileSync(fixturePath, "utf8")) as Parameters<typeof normalizeTranscriptResponse>[0];
}

function buildFixtureDocument(): EditorDocument {
  const normalized = normalizeTranscriptResponse(loadHeathThomasFixture());

  return {
    job_id: "tr_1781456706021_4bdiwu",
    media_url: "",
    duration: normalized.durationSeconds,
    speakers: normalized.speakers.map((speaker) => ({
      speaker_id: speaker.speaker_id,
      display_name: speaker.speaker_label,
      deepgram_speaker: speaker.speaker_index,
      role: undefined,
    })),
    utterances: [],
    words: [],
  };
}

function buildFixtureResolvedSpeakers(document: EditorDocument): ResolvedSpeakerView[] {
  return document.speakers.map((speaker) => {
    if (speaker.deepgram_speaker === 0) {
      return {
        speaker_id: `raw:${speaker.speaker_id}`,
        participantId: `raw:${speaker.speaker_id}`,
        display_name: "THE REPORTER",
        deepgram_speaker: 0,
        role: "REPORTER",
        rawSpeakerIds: [speaker.speaker_id],
        speakerIndices: [0],
      };
    }

    if (speaker.deepgram_speaker === 1) {
      return {
        speaker_id: `raw:${speaker.speaker_id}`,
        participantId: `raw:${speaker.speaker_id}`,
        display_name: "MR. THOMAS",
        deepgram_speaker: 1,
        role: "WITNESS",
        rawSpeakerIds: [speaker.speaker_id],
        speakerIndices: [1],
      };
    }

    if (speaker.deepgram_speaker === 2) {
      return {
        speaker_id: `raw:${speaker.speaker_id}`,
        participantId: `raw:${speaker.speaker_id}`,
        display_name: "MR. NUNEZ",
        deepgram_speaker: 2,
        role: "ATTORNEY",
        rawSpeakerIds: [speaker.speaker_id],
        speakerIndices: [2],
      };
    }

    return {
      speaker_id: `raw:${speaker.speaker_id}`,
      participantId: `raw:${speaker.speaker_id}`,
      display_name: speaker.display_name,
      deepgram_speaker: speaker.deepgram_speaker,
      role: undefined,
      rawSpeakerIds: [speaker.speaker_id],
      speakerIndices: [speaker.deepgram_speaker],
    };
  });
}

function countLabels(document: EditorDocument, resolvedSpeakers: ResolvedSpeakerView[]): LabelCounts {
  const identities = buildTranscriptSpeakerIdentityMap(document, resolvedSpeakers, null);
  const counts: LabelCounts = { correct: 0, incorrect: 0, unmapped: 0 };

  for (const speaker of document.speakers) {
    const label = identities.get(speaker.speaker_id)?.transcriptLabel ?? "";
    const expected = CERTIFIED_LABELS.get(speaker.deepgram_speaker);

    if (isUnresolvedSpeakerLabel(label)) {
      counts.unmapped += 1;
      expect(label).toBe(buildUnresolvedSpeakerLabel(speaker.deepgram_speaker));
      continue;
    }

    if (expected && label === expected) {
      counts.correct += 1;
      continue;
    }

    counts.incorrect += 1;
  }

  return counts;
}

describe("speaker strict fallback acceptance", () => {
  it("turns dangerous generic fallback labels into unresolved markers on the Heath Thomas fixture", () => {
    const document = buildFixtureDocument();
    const resolvedSpeakers = buildFixtureResolvedSpeakers(document);
    const afterCounts = countLabels(document, resolvedSpeakers);

    expect(afterCounts).toEqual({
      correct: 3,
      incorrect: 0,
      unmapped: 5,
    });
    expect(afterCounts.correct).toBe(LEGACY_COUNTS.correct);
    expect(afterCounts.incorrect).toBeLessThan(LEGACY_COUNTS.incorrect);
    expect(afterCounts.unmapped).toBeGreaterThan(LEGACY_COUNTS.unmapped);
  });
});
