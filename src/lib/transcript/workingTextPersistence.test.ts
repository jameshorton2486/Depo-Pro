import { describe, expect, it } from "vitest";
import {
  WorkingTextOverflowError,
  planWorkingTextPersistence,
} from "./workingTextPersistence";

describe("planWorkingTextPersistence", () => {
  it("plans lossless word updates when the edit fits the canonical words", () => {
    const plan = planWorkingTextPersistence(
      "utt_1",
      [
        { word_id: "w1", raw_text: "Good" },
        { word_id: "w2", raw_text: "afternoon." },
      ],
      "Good morning.",
    );

    expect(plan.utteranceText).toBe("Good morning.");
    expect(plan.updates).toEqual([
      {
        wordId: "w1",
        beforeText: "Good",
        nextText: "Good",
        workingText: null,
      },
      {
        wordId: "w2",
        beforeText: "afternoon.",
        nextText: "morning.",
        workingText: "morning.",
      },
    ]);
  });

  it("rejects edits that exceed the utterance word budget", () => {
    expect(() =>
      planWorkingTextPersistence(
        "utt_000000",
        [
          { word_id: "w1", raw_text: "Good" },
          { word_id: "w2", raw_text: "afternoon." },
        ],
        "Good afternoon. We are on the record.",
      ),
    ).toThrow(WorkingTextOverflowError);
  });

  it("rebuilds utterance text from the canonical word updates", () => {
    const plan = planWorkingTextPersistence(
      "utt_1",
      [
        { word_id: "w1", raw_text: "Good" },
        { word_id: "w2", raw_text: "afternoon." },
      ],
      "Good afternoon.",
    );

    expect(plan.utteranceText).toBe("Good afternoon.");
  });
});
