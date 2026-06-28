import { describe, expect, it } from "vitest";

import type { CaseRecord } from "../../types/case";
import {
  applyAiContextualCorrections,
  applyAiSuggestionsToBlocks,
  applyConfirmedSpellings,
  applyLegalPhraseCorrections,
  applyMedicalPhraseCorrections,
  applyMetadataCorrections,
  generateScopistFlags,
  type CorrectionEngineBlock,
} from "./correctionEngines";

function block(overrides: Partial<CorrectionEngineBlock>): CorrectionEngineBlock {
  return {
    utterance_id: "utt_1",
    utterance_index: 1,
    sequence_number: 1,
    block_type: "SP",
    speaker_id: "spk_1",
    display_name: "THE REPORTER",
    text: "Mia Bardo",
    words: [{
      word_id: "w_1",
      utterance_id: "utt_1",
      raw_text: "Mia",
      text: "Mia Bardo",
    }],
    ...overrides,
  };
}

function makeRecord(): CaseRecord {
  return {
    witnesses: [{ name: { value: "Mohammad Etminan" }, role: { value: "WITNESS" } }],
    attorneys: [{ attorney_id: "a1", name: { value: "Dennis Bentley" }, role: { value: "EXAMINING" } }],
  } as unknown as CaseRecord;
}

describe("correctionEngines", () => {
  it("4A corrects Mia Bardo to Miah Bardot", () => {
    const result = applyMetadataCorrections([block({ text: "Mia Bardo" })]);
    expect(result.blocks[0]?.text).toBe("Miah Bardot");
    expect(result.corrections[0]?.authority).toBe("DETERMINISTIC_REGISTRY");
  });

  it("4A corrects penalty of curtory to penalty of perjury", () => {
    const result = applyMetadataCorrections([block({ text: "penalty of curtory" })]);
    expect(result.blocks[0]?.text).toBe("penalty of perjury");
  });

  it("4A corrects Bear County to Bexar County", () => {
    const result = applyMetadataCorrections([block({ text: "Bear County" })]);
    expect(result.blocks[0]?.text).toBe("Bexar County");
  });

  it("4A corrects standalone oath response They do. to I do.", () => {
    const result = applyMetadataCorrections([block({ text: "They do.", words: [
      { word_id: "w_1", utterance_id: "utt_1", raw_text: "They", text: "They" },
      { word_id: "w_2", utterance_id: "utt_1", raw_text: "do.", text: "do." },
    ] })]);
    expect(result.blocks[0]?.text).toBe("I do.");
  });

  it("4B applies confirmed spelling before cutoff but not after", () => {
    const before = block({
      sequence_number: 846,
      text: "Karam",
      words: [{ word_id: "w_1", utterance_id: "utt_1", raw_text: "Caram", text: "Caram" }],
    });
    const after = block({
      utterance_id: "utt_2",
      sequence_number: 847,
      text: "Caram",
      words: [{ word_id: "w_2", utterance_id: "utt_2", raw_text: "Caram", text: "Caram" }],
    });
    const result = applyConfirmedSpellings([before, after], { Caram: "Karam" }, 847);
    expect(result.blocks[0]?.text).toBe("Karam");
    expect(result.blocks[1]?.text).toBe("Caram");
  });

  it("4B does not match Karam inside Karamzade", () => {
    const result = applyConfirmedSpellings([block({
      text: "Karamzade",
      words: [{ word_id: "w_1", utterance_id: "utt_1", raw_text: "Karamzade", text: "Karamzade" }],
    })], { Karam: "Chrisman" }, 10);
    expect(result.blocks[0]?.text).toBe("Karamzade");
  });

  it("4C standardizes objection form in SP blocks only", () => {
    const spResult = applyLegalPhraseCorrections([block({ block_type: "SP", text: "Objection. Form." })]);
    const qResult = applyLegalPhraseCorrections([block({ block_type: "Q", text: "Objection. Form." })]);
    expect(spResult.blocks[0]?.text).toBe("Objection.  Form.");
    expect(qResult.blocks[0]?.text).toBe("Objection. Form.");
  });

  it("4C converts Objection. Four. to Objection.  Form.", () => {
    const result = applyLegalPhraseCorrections([block({ block_type: "SP", text: "Objection. Four." })]);
    expect(result.blocks[0]?.text).toBe("Objection.  Form.");
  });

  it("4C preserves Vague and ambiguous exactly", () => {
    const result = applyLegalPhraseCorrections([block({ block_type: "SP", text: "Objection.  Vague and ambiguous." })]);
    expect(result.blocks[0]?.text).toBe("Objection.  Vague and ambiguous.");
  });

  it("4D corrects medical phrases only in medical case types", () => {
    const result = applyMedicalPhraseCorrections([block({ text: "polyhydraminose" })], "medical_malpractice");
    expect(result.blocks[0]?.text).toBe("polyhydramnios");
  });

  it("4E confidence 0.84 behavior is flag only and uh is never suggested", async () => {
    const blocks = [
      block({
        text: "accent uh",
        words: [
          { word_id: "w_1", utterance_id: "utt_1", raw_text: "accent", text: "accent" },
          { word_id: "w_2", utterance_id: "utt_1", raw_text: "uh", text: "uh" },
        ],
      }),
    ];
    const result = await applyAiContextualCorrections(blocks, makeRecord(), "medical_malpractice");
    expect(result.flags[0]?.original).toBe("accent");
    expect(result.suggestions.some((item) => item.original === "uh")).toBe(false);
  });

  it("4E generates money amount flag with no correction", async () => {
    const result = await applyAiContextualCorrections([block({
      text: "I was paid $7.50 an hour",
      words: [{ word_id: "w_1", utterance_id: "utt_1", raw_text: "$7.50", text: "$7.50" }],
    })], makeRecord(), "personal_injury");
    expect(result.flags[0]?.flag_text).toContain("MONEY_AMOUNT");
  });

  it("4E auto-applies high confidence suggestions to working_text", async () => {
    const review = await applyAiContextualCorrections([block({
      text: "raiding",
      words: [{ word_id: "w_1", utterance_id: "utt_1", raw_text: "raiding", text: "raiding" }],
    })], makeRecord(), "medical_malpractice");
    const applied = applyAiSuggestionsToBlocks([block({
      text: "raiding",
      words: [{ word_id: "w_1", utterance_id: "utt_1", raw_text: "raiding", text: "raiding" }],
    })], review.suggestions);
    expect(review.suggestions[0]?.confidence).toBe(0.93);
    expect(applied[0]?.words[0]?.working_text).toBe("radiating");
  });

  it("4F flags proper nouns not in keyterms", () => {
    const result = generateScopistFlags({
      blocks: [block({
        text: "Chrestman",
        words: [{ word_id: "w_1", utterance_id: "utt_1", raw_text: "Chrestman", text: "Chrestman" }],
      })],
      keyterms: [],
      confirmedSpellings: {},
    });
    expect(result[0]?.category).toBe("VERIFY_SPELLING");
  });
});
