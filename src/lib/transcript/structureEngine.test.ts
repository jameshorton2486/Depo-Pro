import { describe, expect, it } from "vitest";

import {
  applyByLineToNextQuestion,
  classifyBlocks,
  extractEmbeddedObjections,
  mergeConsecutiveFragments,
  validateConversationFlow,
  verifyColloquy,
  type ClassifiedBlock,
  type StructureSpeakerMapEntry,
  type StructureUtterance,
} from "./structureEngine";

const speakerMap: Record<string, StructureSpeakerMapEntry> = {
  reporter: { display_name: "THE REPORTER", role: "REPORTER" },
  witness: { display_name: "THE WITNESS", role: "WITNESS" },
  bentley: { display_name: "MR.  BENTLEY", role: "ATTORNEY" },
  durbin: { display_name: "MS.  DURBIN", role: "ATTORNEY" },
};

function utterance(overrides: Partial<StructureUtterance>): StructureUtterance {
  return {
    utterance_index: 0,
    utterance_id: "utt_0",
    speaker_id: "bentley",
    text: "Please state your name for the record?",
    ...overrides,
  };
}

describe("structureEngine", () => {
  it("classifies reporter blocks as SP, never Q or A", async () => {
    const [block] = await classifyBlocks([utterance({ speaker_id: "reporter", text: "Raise your right hand." })], speakerMap);
    expect(block?.block_type).toBe("SP");
  });

  it("classifies witness blocks as A, never Q", async () => {
    const [block] = await classifyBlocks([utterance({ speaker_id: "witness", text: "I was driving north on the highway." })], speakerMap);
    expect(block?.block_type).toBe("A");
  });

  it("classifies standalone Yes from witness as A", async () => {
    const [block] = await classifyBlocks([utterance({ speaker_id: "witness", text: "Yes." })], speakerMap);
    expect(block?.block_type).toBe("A");
  });

  it("classifies merged question and answer as NEEDS_SPLIT", async () => {
    const [block] = await classifyBlocks([utterance({ text: "Do you understand that?  Yes." })], speakerMap);
    expect(block?.block_type).toBe("NEEDS_SPLIT");
  });

  it("extracts objection from answer block", async () => {
    const [result] = await extractEmbeddedObjections([{
      utterance_index: 4,
      utterance_id: "utt_4",
      block_type: "NEEDS_EXTRACT",
      speaker_id: "witness",
      display_name: "THE WITNESS",
      confidence: 0.9,
      text: "I went to the store. Objection. Form. You can answer. Then I left.",
    }], speakerMap);

    expect(result?.extracted_objection.text).toBe("Objection. Form. You can answer.");
    expect(result?.remaining_a_text).toBe("I went to the store. Then I left.");
  });

  it("prepends BY-line to next question after objection extraction", () => {
    const blocks: Array<ClassifiedBlock & { text: string }> = [
      { utterance_index: 1, utterance_id: "utt_1", block_type: "SP", speaker_id: "durbin", display_name: "MS.  DURBIN", confidence: 1, text: "Objection. Form." },
      { utterance_index: 2, utterance_id: "utt_2", block_type: "Q", speaker_id: "bentley", display_name: "MR.  BENTLEY", confidence: 1, text: "What happened next?" },
    ];

    const result = applyByLineToNextQuestion(blocks, "MR.  BENTLEY");
    expect(result[1]?.text).toBe("(BY MR.  BENTLEY)  What happened next?");
  });

  it("merges consecutive same-speaker incomplete fragments", () => {
    const result = mergeConsecutiveFragments([
      { utterance_index: 1, utterance_id: "utt_1", block_type: "Q", speaker_id: "bentley", display_name: "MR.  BENTLEY", confidence: 1, text: "Please state" },
      { utterance_index: 2, utterance_id: "utt_2", block_type: "Q", speaker_id: "bentley", display_name: "MR.  BENTLEY", confidence: 1, text: "your full name." },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.text).toBe("Please state your full name.");
  });

  it("removes duplicated long words while preserving short duplicates", () => {
    const longDuplicate = mergeConsecutiveFragments([
      { utterance_index: 1, utterance_id: "utt_1", block_type: "A", speaker_id: "witness", display_name: "THE WITNESS", confidence: 1, text: "correct correct" },
    ]);
    const shortDuplicate = mergeConsecutiveFragments([
      { utterance_index: 1, utterance_id: "utt_1", block_type: "A", speaker_id: "witness", display_name: "THE WITNESS", confidence: 1, text: "I I was there" },
    ]);

    expect(longDuplicate[0]?.text).toBe("correct");
    expect(shortDuplicate[0]?.text).toBe("I I was there");
  });

  it("inserts a flow violation for double question sequences", async () => {
    const result = await validateConversationFlow([
      { utterance_index: 1, utterance_id: "utt_1", block_type: "Q", speaker_id: "bentley", display_name: "MR.  BENTLEY", confidence: 1, text: "Question one?" },
      { utterance_index: 2, utterance_id: "utt_2", block_type: "Q", speaker_id: "bentley", display_name: "MR.  BENTLEY", confidence: 1, text: "Question two?" },
    ]);

    expect(result.violations[0]?.violation_type).toBe("DOUBLE_QUESTION");
    expect(result.violations[0]?.flag_text).toContain("[SCOPIST: FLAG 1:");
  });

  it("reclassifies witness Yes from SP to A during colloquy verification", async () => {
    const result = await verifyColloquy([{
      utterance_index: 3,
      utterance_id: "utt_3",
      block_type: "SP",
      speaker_id: "witness",
      display_name: "THE WITNESS",
      confidence: 0.8,
      text: "Yes.",
    }], speakerMap);

    expect(result[0]?.correct_type).toBe("A");
  });
});
