import { describe, expect, it } from "vitest";
import { buildEditorContent } from "./buildEditorContent";
import type { EditorDocument } from "../api/types";
import type { CaseRecord } from "../types/case";

function makeDoc(overrides?: Partial<EditorDocument>): EditorDocument {
  return {
    job_id: "job-1",
    media_url: "http://example.test/audio.wav",
    duration: 120,
    speakers: [
      {
        speaker_id: "spk-1",
        display_name: "THE WITNESS",
        deepgram_speaker: 0,
        role: "WITNESS",
      },
    ],
    utterances: [
      {
        utterance_id: "utt-1",
        speaker_id: "spk-1",
        start_time: 0,
        end_time: 1,
        word_ids: ["word-1"],
      },
    ],
    words: [
      {
        word_id: "word-1",
        text: "Hello",
        raw_text: "Hello",
        speaker_id: "spk-1",
        utterance_id: "utt-1",
        start_time: 0,
        end_time: 1,
        confidence: 1,
        reviewed: false,
        edited: false,
      },
    ],
    ...overrides,
  };
}

function makeWord(
  word_id: string,
  text: string,
  overrides?: Partial<EditorDocument["words"][number]>
): EditorDocument["words"][number] {
  return {
    word_id,
    text,
    raw_text: text,
    speaker_id: "spk-1",
    utterance_id: "utt-1",
    start_time: 0,
    end_time: 1,
    confidence: 1,
    reviewed: false,
    edited: false,
    ...overrides,
  };
}

function makeSingleUtteranceDoc(words: EditorDocument["words"]): EditorDocument {
  return makeDoc({
    utterances: [
      {
        utterance_id: "utt-1",
        speaker_id: "spk-1",
        start_time: 0,
        end_time: words.length,
        word_ids: words.map((word) => word.word_id),
      },
    ],
    words: words.map((word, index) => ({
      ...word,
      start_time: index,
      end_time: index + 0.5,
    })),
  });
}

function readUtteranceContentText(content: ReturnType<typeof buildEditorContent>): string {
  const utterance = content.content?.find((node) => node.type === "utterance");
  if (!utterance) {
    throw new Error("Expected an utterance block.");
  }

  return (utterance.content ?? [])
    .map((node) => node.text ?? "")
    .join("");
}

function firstUtteranceAttrs(content: ReturnType<typeof buildEditorContent>) {
  const utterance = content.content?.find((node) => node.type === "utterance");
  if (!utterance?.attrs) {
    throw new Error("Expected utterance attrs.");
  }

  return utterance.attrs as Record<string, unknown>;
}

function utteranceAttrsBySpeaker(
  content: ReturnType<typeof buildEditorContent>,
  speakerId: string,
) {
  const utterance = content.content?.find(
    (node) => node.type === "utterance" && node.attrs?.speaker_id === speakerId,
  );
  if (!utterance?.attrs) {
    throw new Error(`Expected utterance attrs for speaker "${speakerId}".`);
  }

  return utterance.attrs as Record<string, unknown>;
}

function makeRecord(): CaseRecord {
  return {
    reporter: { name: { value: "Nellie Bardel" } },
    witnesses: [{ name: { value: "Mohammad Etminan" }, prefix_suffix: "Dr." }],
    attorneys: [
      { attorney_id: "a1", name: { value: "Dennis Bentley" }, role: { value: "EXAMINING" } },
    ],
  } as unknown as CaseRecord;
}

describe("buildEditorContent", () => {
  it("skips empty-text words and leaves a valid placeholder when an utterance has no renderable words", () => {
    const doc = makeDoc({
      utterances: [
        {
          utterance_id: "utt-1",
          speaker_id: "spk-1",
          start_time: 0,
          end_time: 1,
          word_ids: ["word-1", "missing-word"],
        },
        {
          utterance_id: "utt-2",
          speaker_id: "spk-1",
          start_time: 2,
          end_time: 3,
          word_ids: ["word-2"],
        },
      ],
      words: [
        {
          word_id: "word-1",
          text: "",
          raw_text: "",
          speaker_id: "spk-1",
          utterance_id: "utt-1",
          start_time: 0,
          end_time: 1,
          confidence: 1,
          reviewed: false,
          edited: false,
        },
        {
          word_id: "word-2",
          text: "",
          raw_text: "",
          speaker_id: "spk-1",
          utterance_id: "utt-2",
          start_time: 2,
          end_time: 3,
          confidence: 1,
          reviewed: false,
          edited: false,
        },
      ],
    });

    const content = buildEditorContent(doc);
    const utterances = content.content?.filter((node) => node.type === "utterance");

    expect(utterances).toHaveLength(2);
    expect(utterances?.[0].content).toEqual([{ type: "text", text: " " }]);
    expect(utterances?.[1].content).toEqual([{ type: "text", text: " " }]);
  });

  it("preserves the No. spacing rule in workspace content", () => {
    const numeric = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "No."),
        makeWord("word-2", "12129"),
      ])
    );
    const sentence = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "No."),
        makeWord("word-2", "No."),
      ])
    );

    expect(readUtteranceContentText(numeric)).toBe("No. 12129");
    expect(readUtteranceContentText(sentence)).toBe("No.  No.");
  });

  it("preserves deterministic punctuation normalization in workspace content", () => {
    const question = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "August"),
        makeWord("word-2", "17th?\""),
        makeWord("word-3", "What"),
      ])
    );
    const dash = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "one-year,\""),
        makeWord("word-2", "--"),
        makeWord("word-3", "no."),
      ])
    );

    expect(readUtteranceContentText(question)).toBe("August 17th\"?  What");
    expect(readUtteranceContentText(dash)).toBe("one-year\" -- no.");
  });

  it("preserves deterministic capitalization, numerals, and inline flags in workspace content", () => {
    const capitalization = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "yourself,"),
        makeWord("word-2", "doctor,"),
        makeWord("word-3", "if"),
      ])
    );
    const numerals = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "fifty-seven"),
        makeWord("word-2", "years"),
        makeWord("word-3", "old."),
      ])
    );
    const flagged = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "lameness", { confidence: 0.5 }),
      ])
    );

    expect(readUtteranceContentText(capitalization)).toBe("yourself, doctor, if");
    expect(readUtteranceContentText(numerals)).toBe("57 years old.");
    expect(readUtteranceContentText(flagged)).toContain("lameness [SCOPIST: FLAG 1:");
  });

  it("does not emit non-breaking spaces in workspace content", () => {
    const content = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "No."),
        makeWord("word-2", "No."),
      ])
    );

    expect(readUtteranceContentText(content)).not.toContain("\u00a0");
  });

  it("exposes canonical Tab3 and Tab4 geometry on utterance attrs", () => {
    const content = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "Hello."),
      ])
    );

    const attrs = firstUtteranceAttrs(content);

    expect(attrs.tab_qa_label_inches).toBe(0.5);
    expect(attrs.tab_qa_text_inches).toBe(1.0);
    expect(attrs.tab_speaker_inches).toBe(1.5);
    expect(attrs.tab_parenthetical_inches).toBe(2.0);
    expect(attrs.left_margin_inches).toBe(1.25);
    expect(attrs.right_margin_inches).toBe(0.75);
    expect(attrs.line_spacing_points).toBe(28);
  });

  it("keeps raw labels until inferred structure is confirmed", () => {
    const doc = makeSingleUtteranceDoc([
      makeWord("word-1", "This", {
        speaker_id: "spk-1",
        utterance_id: "utt-1",
      }),
      makeWord("word-2", "is cause number", {
        speaker_id: "spk-1",
        utterance_id: "utt-1",
      }),
      makeWord("word-3", "123.", {
        speaker_id: "spk-1",
        utterance_id: "utt-1",
      }),
    ]);
    doc.speakers = [
      {
        speaker_id: "spk-1",
        display_name: "Speaker 1",
        deepgram_speaker: 1,
        role: "OTHER",
      },
    ];
    const rawAttrs = firstUtteranceAttrs(buildEditorContent(doc));
    const confirmedAttrs = firstUtteranceAttrs(buildEditorContent(doc, {
      structureConfirmed: true,
      record: makeRecord(),
    }));

    expect(rawAttrs.speaker_label).toBe("Speaker 1");
    expect(rawAttrs.prefix_text).toBe("SPEAKER 1:");
    expect(confirmedAttrs.speaker_label).toBe("THE REPORTER");
    expect(confirmedAttrs.prefix_text).toBe("THE REPORTER:");
  });
  it("keeps raw labels when keepRawLabels is selected after banner dismissal", () => {
    const doc = makeSingleUtteranceDoc([
      makeWord("word-1", "This", {
        speaker_id: "spk-1",
        utterance_id: "utt-1",
      }),
      makeWord("word-2", "is cause number", {
        speaker_id: "spk-1",
        utterance_id: "utt-1",
      }),
      makeWord("word-3", "123.", {
        speaker_id: "spk-1",
        utterance_id: "utt-1",
      }),
    ]);
    doc.speakers = [
      {
        speaker_id: "spk-1",
        display_name: "Speaker 1",
        deepgram_speaker: 1,
        role: "OTHER",
      },
    ];

    const rawChosenAttrs = firstUtteranceAttrs(buildEditorContent(doc, {
      structureConfirmed: true,
      keepRawLabels: true,
      record: makeRecord(),
    }));

    expect(rawChosenAttrs.speaker_label).toBe("Speaker 1");
    expect(rawChosenAttrs.prefix_text).toBe("SPEAKER 1:");
  });

  it("writes ATTORNEY role into structured utterance attrs for q lines", () => {
    const doc = makeDoc({
      speakers: [
        {
          speaker_id: "spk-1",
          display_name: "MR. BENTLEY",
          deepgram_speaker: 0,
          role: "ATTORNEY",
        },
      ],
      words: [
        makeWord("word-1", "State", { speaker_id: "spk-1", utterance_id: "utt-1" }),
        makeWord("word-2", "your", { speaker_id: "spk-1", utterance_id: "utt-1" }),
        makeWord("word-3", "name.", { speaker_id: "spk-1", utterance_id: "utt-1" }),
      ],
    });

    const content = buildEditorContent(doc, {
      structureConfirmed: true,
      record: makeRecord(),
    });

    expect(utteranceAttrsBySpeaker(content, "spk-1").role).toBe("ATTORNEY");
    expect(utteranceAttrsBySpeaker(content, "spk-1").prefix_text).toBe("Q.");
    expect(utteranceAttrsBySpeaker(content, "spk-1").formatted_line_role).toBe("q");
  });

  it("writes WITNESS role into structured utterance attrs for a lines", () => {
    const doc = makeDoc({
      speakers: [
        {
          speaker_id: "spk-1",
          display_name: "THE WITNESS",
          deepgram_speaker: 0,
          role: "WITNESS",
        },
      ],
      words: [
        makeWord("word-1", "Mohammad", { speaker_id: "spk-1", utterance_id: "utt-1" }),
        makeWord("word-2", "Etminan.", { speaker_id: "spk-1", utterance_id: "utt-1" }),
      ],
    });

    const content = buildEditorContent(doc, {
      structureConfirmed: true,
      record: makeRecord(),
    });

    expect(utteranceAttrsBySpeaker(content, "spk-1").role).toBe("WITNESS");
    expect(utteranceAttrsBySpeaker(content, "spk-1").prefix_text).toBe("A.");
    expect(utteranceAttrsBySpeaker(content, "spk-1").formatted_line_role).toBe("a");
  });

  it("preserves raw speaker role attrs when structure is not confirmed", () => {
    const doc = makeDoc({
      speakers: [
        {
          speaker_id: "spk-1",
          display_name: "MR. BENTLEY",
          deepgram_speaker: 0,
          role: "ATTORNEY",
        },
      ],
    });

    const content = buildEditorContent(doc, {
      structureConfirmed: false,
    });

    expect(utteranceAttrsBySpeaker(content, "spk-1").role).toBe("ATTORNEY");
    expect(utteranceAttrsBySpeaker(content, "spk-1").prefix_text).toBe("Q.");
  });

  it("renders pending ai suggestions with the overlay text and pending class", () => {
    const doc = makeSingleUtteranceDoc([
      {
        ...makeWord("word-1", "raiding"),
        working_text: null,
        ai_suggestion: "radiating",
        ai_suggestion_status: "pending",
      } as EditorDocument["words"][number],
    ]);

    const content = buildEditorContent(doc);
    const utterance = content.content?.find((node) => node.type === "utterance");
    const mark = utterance?.content?.[0]?.marks?.[0];

    expect(utterance?.content?.[0]?.text).toBe("radiating");
    expect(mark?.attrs?.ai_layer).toBe("ai_suggestion");
    expect(mark?.attrs?.ai_pending).toBe(true);
  });

  it("merges fragmented structured answers into one editor block while preserving first-line attrs", () => {
    const doc = makeDoc({
      speakers: [
        {
          speaker_id: "spk-1",
          display_name: "THE WITNESS",
          deepgram_speaker: 0,
          role: "WITNESS",
        },
      ],
      utterances: [
        { utterance_id: "utt-1", speaker_id: "spk-1", start_time: 0, end_time: 1, word_ids: ["word-1"] },
        { utterance_id: "utt-2", speaker_id: "spk-1", start_time: 1, end_time: 2, word_ids: ["word-2"] },
        { utterance_id: "utt-3", speaker_id: "spk-1", start_time: 2, end_time: 3, word_ids: ["word-3"] },
      ],
      words: [
        makeWord("word-1", "Sure.", { utterance_id: "utt-1" }),
        makeWord("word-2", "So", { utterance_id: "utt-2", start_time: 1, end_time: 2 }),
        makeWord("word-3", "in my experience treating patients.", { utterance_id: "utt-3", start_time: 2, end_time: 3 }),
      ],
    });

    const content = buildEditorContent(doc, {
      structureConfirmed: true,
      record: makeRecord(),
    });
    const utterances = content.content?.filter((node) => node.type === "utterance") ?? [];
    const attrs = firstUtteranceAttrs(content);

    expect(utterances).toHaveLength(1);
    expect(readUtteranceContentText(content)).toContain("Sure. So in my experience treating patients.");
    expect(attrs.page_line_number).toBe(1);
    expect(attrs.line_number).toBe(1);
    expect(attrs.prefix_text).toBe("A.");
    expect(attrs.formatted_line_role).toBe("a");
    expect(attrs.continuation_mode).toBe("return_to_margin");
  });

  it("renders standalone No. witness answers as A blocks in the editor", () => {
    const doc = makeDoc({
      speakers: [
        {
          speaker_id: "spk-q",
          display_name: "MR. BENTLEY",
          deepgram_speaker: 0,
          role: "ATTORNEY",
        },
        {
          speaker_id: "spk-a",
          display_name: "THE WITNESS",
          deepgram_speaker: 1,
          role: "WITNESS",
        },
      ],
      utterances: [
        { utterance_id: "utt-q", speaker_id: "spk-q", start_time: 0, end_time: 1, word_ids: ["word-q"] },
        { utterance_id: "utt-a", speaker_id: "spk-a", start_time: 1, end_time: 2, word_ids: ["word-a"] },
      ],
      words: [
        makeWord("word-q", "Do you do shoulder surgeries?", { speaker_id: "spk-q", utterance_id: "utt-q" }),
        makeWord("word-a", "No.", { speaker_id: "spk-a", utterance_id: "utt-a", start_time: 1, end_time: 2 }),
      ],
    });

    const content = buildEditorContent(doc, {
      structureConfirmed: true,
      record: makeRecord(),
    });
    const answerAttrs = utteranceAttrsBySpeaker(content, "spk-a");

    expect(answerAttrs.prefix_text).toBe("A.");
    expect(answerAttrs.formatted_line_role).toBe("a");
  });

  it("builds editor content for large synthetic transcripts without dropping utterance blocks", () => {
    const utterances: EditorDocument["utterances"] = [];
    const words: EditorDocument["words"] = [];

    for (let index = 0; index < 300; index += 1) {
      const utteranceId = `utt-${index + 1}`;
      const firstWordId = `w-${index + 1}-1`;
      const secondWordId = `w-${index + 1}-2`;
      utterances.push({
        utterance_id: utteranceId,
        speaker_id: "spk-1",
        start_time: index,
        end_time: index + 1,
        word_ids: [firstWordId, secondWordId],
      });
      words.push(
        {
          word_id: firstWordId,
          text: "Question",
          raw_text: "Question",
          speaker_id: "spk-1",
          utterance_id: utteranceId,
          start_time: index,
          end_time: index + 0.4,
          confidence: 1,
          reviewed: false,
          edited: false,
        },
        {
          word_id: secondWordId,
          text: String(index + 1),
          raw_text: String(index + 1),
          speaker_id: "spk-1",
          utterance_id: utteranceId,
          start_time: index + 0.4,
          end_time: index + 0.8,
          confidence: 1,
          reviewed: false,
          edited: false,
        },
      );
    }

    const content = buildEditorContent(makeDoc({ utterances, words }));
    const contentUtterances = content.content?.filter((node) => node.type === "utterance") ?? [];

    expect(contentUtterances).toHaveLength(300);
    expect(contentUtterances[0]?.attrs?.utterance_id).toBe("utt-1");
    expect(contentUtterances[299]?.attrs?.utterance_id).toBe("utt-300");
  });

});
