import { describe, expect, it } from "vitest";
import type { StageSParticipantInput } from "../speakerMapping";
import type { StageSUtteranceInput } from "./renderer";
import { renderStageS } from "./renderer";
import {
  LINE_A,
  LINE_BY,
  LINE_COLLOQUY,
  LINE_EXAMINATION,
  LINE_FLAGGED,
  LINE_PARENTHETICAL,
  LINE_Q,
  OFF_RECORD,
  ON_RECORD,
} from "./models";

function makeUtterance(overrides: Partial<StageSUtteranceInput>): StageSUtteranceInput {
  return {
    utterance_id: overrides.utterance_id ?? "utt-1",
    utterance_index: overrides.utterance_index ?? 0,
    speaker_index: overrides.speaker_index ?? 0,
    speaker_label: overrides.speaker_label ?? `Speaker ${overrides.speaker_index ?? 0}`,
    start_time: overrides.start_time ?? 0,
    text: overrides.text ?? "",
  };
}

function makeParticipant(overrides: Partial<StageSParticipantInput>): StageSParticipantInput {
  return {
    role: overrides.role ?? "ATTORNEY",
    name: overrides.name ?? "Marco Nunez",
    honorific: overrides.honorific ?? "MR",
    speakerIndices: overrides.speakerIndices ?? [0],
    sortOrder: overrides.sortOrder ?? 0,
    createdAt: overrides.createdAt ?? "2026-06-13T00:00:00.000Z",
  };
}

describe("renderStageS", () => {
  it("emits the opening ritual once and types a mapped examiner/witness exchange as Q/A", () => {
    const participants = [
      makeParticipant({ role: "ATTORNEY", speakerIndices: [0], name: "Marco Nunez" }),
      makeParticipant({ role: "WITNESS", speakerIndices: [1], name: "Heath Thomas", honorific: "DR" }),
    ];
    const utterances = [
      makeUtterance({ utterance_id: "utt-1", utterance_index: 0, speaker_index: 0, text: "Please state your name." }),
      makeUtterance({ utterance_id: "utt-2", utterance_index: 1, speaker_index: 1, text: "Heath Thomas." }),
      makeUtterance({ utterance_id: "utt-3", utterance_index: 2, speaker_index: 0, text: "Where do you work?" }),
    ];

    const result = renderStageS(utterances, participants);

    expect(result.lines.map((line) => line.lineType)).toEqual([
      LINE_EXAMINATION,
      LINE_BY,
      LINE_Q,
      LINE_A,
      LINE_Q,
    ]);
    expect(result.lines[1]?.text).toBe("BY MR. NUNEZ:");
    expect(result.lines[2]?.text).toBe("Please state your name.");
    expect(result.lines[4]?.text).toBe("Where do you work?");
  });

  it("renders a mapped non-Q/A speaker as named colloquy", () => {
    const result = renderStageS(
      [makeUtterance({ utterance_id: "utt-10", speaker_index: 3, text: "Please speak one at a time." })],
      [makeParticipant({ role: "REPORTER", speakerIndices: [3], name: "Jane Reporter" })],
    );

    expect(result.lines).toEqual([
      expect.objectContaining({
        lineType: LINE_COLLOQUY,
        text: "THE REPORTER:  Please speak one at a time.",
        speakerLabel: "THE REPORTER:",
      }),
    ]);
  });

  it("renders an unmapped speaker cluster as flagged without dropping text", () => {
    const result = renderStageS(
      [makeUtterance({ utterance_id: "utt-20", speaker_index: 8, speaker_label: "Speaker 8", text: "Unknown testimony." })],
      [],
    );

    expect(result.lines).toEqual([
      expect.objectContaining({
        lineType: LINE_FLAGGED,
        text: "Unknown testimony.",
        speakerLabel: "Speaker 8",
      }),
    ]);
  });

  it("isolates an objection, appends an interruption dash, and resumes with inline BY after colloquy", () => {
    const participants = [
      makeParticipant({ role: "ATTORNEY", speakerIndices: [0], name: "Marco Nunez" }),
      makeParticipant({ role: "WITNESS", speakerIndices: [1], name: "Heath Thomas", honorific: "DR" }),
      makeParticipant({ role: "defending_attorney", speakerIndices: [2], name: "Victor Madrid", honorific: "MR" }),
    ];
    const utterances = [
      makeUtterance({ utterance_id: "utt-30", utterance_index: 0, speaker_index: 0, text: "State your full name," }),
      makeUtterance({ utterance_id: "utt-31", utterance_index: 1, speaker_index: 2, text: "Objection, form." }),
      makeUtterance({ utterance_id: "utt-32", utterance_index: 2, speaker_index: 0, text: "State your full name for the record." }),
    ];

    const result = renderStageS(utterances, participants);

    expect(result.lines.map((line) => line.lineType)).toEqual([
      LINE_EXAMINATION,
      LINE_BY,
      LINE_Q,
      LINE_COLLOQUY,
      LINE_Q,
    ]);
    expect(result.lines[2]?.text).toBe("State your full name --");
    expect(result.lines[3]?.text).toBe("MR. MADRID:  Objection, form.");
    expect(result.lines[4]?.text).toBe("(BY MR. NUNEZ)  State your full name for the record.");
    expect(result.objectionCount).toBe(1);
  });

  it("prepends a resumption dash when the objection does not break attribution", () => {
    const participants = [
      makeParticipant({ role: "ATTORNEY", speakerIndices: [0], name: "Marco Nunez" }),
      makeParticipant({ role: "WITNESS", speakerIndices: [1], name: "Heath Thomas", honorific: "DR" }),
      makeParticipant({ role: "defending_attorney", speakerIndices: [2], name: "Victor Madrid", honorific: "MR" }),
    ];
    const utterances = [
      makeUtterance({ utterance_id: "utt-33", utterance_index: 0, speaker_index: 0, text: "Tell me what happened:" }),
      makeUtterance({ utterance_id: "utt-34", utterance_index: 1, speaker_index: 2, text: "Objection, vague and ambiguous." }),
      makeUtterance({ utterance_id: "utt-35", utterance_index: 2, speaker_index: 1, text: "I went to the store." }),
    ];

    const result = renderStageS(utterances, participants);

    expect(result.lines[2]?.text).toBe("Tell me what happened --");
    expect(result.lines[4]?.text).toBe("-- I went to the store.");
  });

  it("handles off-record transitions and re-emits the BY line on return", () => {
    const participants = [
      makeParticipant({ role: "videographer", speakerIndices: [9], name: "Vince Video" }),
      makeParticipant({ role: "ATTORNEY", speakerIndices: [0], name: "Marco Nunez" }),
      makeParticipant({ role: "WITNESS", speakerIndices: [1], name: "Heath Thomas", honorific: "DR" }),
    ];
    const utterances = [
      makeUtterance({ utterance_id: "utt-40", utterance_index: 0, speaker_index: 0, text: "Please state your name." }),
      makeUtterance({ utterance_id: "utt-41", utterance_index: 1, speaker_index: 9, text: "We are going off the record at 10:42 a.m." }),
      makeUtterance({ utterance_id: "utt-42", utterance_index: 2, speaker_index: 1, text: "We discussed scheduling." }),
      makeUtterance({ utterance_id: "utt-43", utterance_index: 3, speaker_index: 9, text: "Back on the record at 10:45 a.m." }),
      makeUtterance({ utterance_id: "utt-44", utterance_index: 4, speaker_index: 0, text: "Where do you work?" }),
    ];

    const result = renderStageS(utterances, participants);

    expect(result.lines.map((line) => line.lineType)).toEqual([
      LINE_EXAMINATION,
      LINE_BY,
      LINE_Q,
      LINE_PARENTHETICAL,
      LINE_COLLOQUY,
      LINE_PARENTHETICAL,
      LINE_BY,
      LINE_Q,
    ]);
    expect(result.lines[3]?.text).toBe("(Recess taken at 10:42 a.m.)");
    expect(result.lines[4]?.renderState).toBe(OFF_RECORD);
    expect(result.lines[4]?.text).toBe("DR. THOMAS:  We discussed scheduling.");
    expect(result.lines[5]?.text).toBe("(Back on the record at 10:45 a.m.)");
    expect(result.lines[6]?.text).toBe("BY MR. NUNEZ:");
    expect(result.lines[7]?.renderState).toBe(ON_RECORD);
    expect(result.offRecordSpanCount).toBe(1);
  });

  it("does not add inline BY on an unbroken Q/A exchange", () => {
    const participants = [
      makeParticipant({ role: "ATTORNEY", speakerIndices: [0], name: "Marco Nunez" }),
      makeParticipant({ role: "WITNESS", speakerIndices: [1], name: "Heath Thomas", honorific: "DR" }),
    ];
    const utterances = [
      makeUtterance({ utterance_id: "utt-50", utterance_index: 0, speaker_index: 0, text: "Please state your name." }),
      makeUtterance({ utterance_id: "utt-51", utterance_index: 1, speaker_index: 1, text: "Heath Thomas." }),
      makeUtterance({ utterance_id: "utt-52", utterance_index: 2, speaker_index: 0, text: "Where do you work?" }),
    ];

    const result = renderStageS(utterances, participants);

    expect(result.lines[4]?.text).toBe("Where do you work?");
  });

  it("is deterministic and idempotent for the same input", () => {
    const participants = [
      makeParticipant({ role: "ATTORNEY", speakerIndices: [0], name: "Marco Nunez" }),
      makeParticipant({ role: "WITNESS", speakerIndices: [1], name: "Heath Thomas", honorific: "DR" }),
    ];
    const utterances = [
      makeUtterance({ utterance_id: "utt-60", utterance_index: 0, speaker_index: 0, text: "Please state your name." }),
      makeUtterance({ utterance_id: "utt-61", utterance_index: 1, speaker_index: 1, text: "Heath Thomas." }),
    ];

    const first = renderStageS(utterances, participants);
    const second = renderStageS(utterances, participants);

    expect(second).toEqual(first);
  });
});
