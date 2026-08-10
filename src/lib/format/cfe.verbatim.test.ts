/**
 * C1 — Verbatim guard for the Workspace first-render format pass.
 *
 * A11 (No fabrication of the spoken record) + ADR-0017: the first render a
 * reporter sees is a FORMAT pass, not a correction pass. It must never replace
 * a source word with a DIFFERENT word. Historically cfe applied lexical
 * substitutions from the correction registry on EVERY render (e.g. a witness
 * or attorney named "Peterson" silently rewritten to "Bentley", "K." →
 * "Okay.", "metastructures" → "ligamentous structures"), which is exactly what
 * A11 forbids. C1 gates those correction-registry substitutions out of the
 * first render.
 *
 * SCOPE (deliberately narrow): this guard covers correction-registry LEXICAL
 * substitution — one lexeme swapped for a different lexeme. It does NOT cover
 * same-lexeme typographic normalization (numeral style "fifty-seven" → "57",
 * sentence capitalization, quoted-question-mark placement), which still runs
 * on first render and is a separate open question flagged for the C2 verbatim
 * audit. The fixture below therefore contains no number words, so the strict
 * byte comparison holds.
 *
 * The comparison endpoints are deliberate (see review guidance): word
 * characters as stored in raw_text  →  word characters as they appear in the
 * rendered document model. Everything in between is inside the guard. The one
 * permitted addition is the F6 interruption dash, a structural insertion that
 * appends " --" to a preserved word; the guard strips only that before
 * comparing. Precondition: a fresh transcript where working text == raw_text
 * (the first-render state, before any reporter edit).
 */
import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../../api/types";
import { emptyCaseRecord } from "../../types/case";
import { buildCanonicalExportRenderModel } from "../export/exportAdapter";
import { abbreviationRegistry } from "./abbreviationRegistry";
import { cfe } from "./cfe";
import { DEFAULT_GEOMETRY_PROFILE } from "./geometryProfile";
import type { FormattedDocument } from "./types";

function makeDoc(
  words: Array<{ word_id: string; text: string }>,
): EditorDocument {
  return {
    job_id: "job-verbatim",
    media_url: "http://example.test/audio.wav",
    duration: 120,
    speakers: [
      { speaker_id: "spk-1", display_name: "Mr. Nunez", deepgram_speaker: 0, role: "ATTORNEY" },
    ],
    utterances: [
      {
        utterance_id: "utt-1",
        speaker_id: "spk-1",
        start_time: 0,
        end_time: words.length,
        word_ids: words.map((word) => word.word_id),
      },
    ],
    // Fresh transcript: working text == raw_text for every word.
    words: words.map((word, index) => ({
      word_id: word.word_id,
      text: word.text,
      raw_text: word.text,
      speaker_id: "spk-1",
      utterance_id: "utt-1",
      start_time: index,
      end_time: index + 0.5,
      confidence: 1,
      reviewed: false,
      edited: false,
    })),
  };
}

/**
 * Fail-loud verbatim assertion. For every rendered word, the character
 * sequence — after stripping only a permitted trailing F6 interruption dash —
 * must equal its raw_text. On any mismatch it throws naming the specific word,
 * its render index, and BOTH values, so a regression is diagnosable at a
 * glance rather than as an opaque "sequences differ".
 */
function assertWordsVerbatim(formatted: FormattedDocument): void {
  const violations: string[] = [];
  let wordIndex = -1;

  for (const line of formatted.lines) {
    for (const word of line.words) {
      wordIndex += 1;
      // Permitted addition: the F6 interruption dash is inserted BETWEEN
      // preserved words, appending " --" to the first of a repeated pair.
      const rendered = word.text.replace(/\s*--\s*$/, "");
      // Permitted correction: the ADR-0018 bounded exception canonicalizes a
      // whole standalone "K." / "k." utterance to "Okay." on every render. This
      // is a bounded exception to the verbatim floor, not a fabrication.
      if (rendered === "Okay." && (word.raw_text === "K." || word.raw_text === "k.")) {
        continue;
      }
      if (rendered !== word.raw_text) {
        violations.push(
          `  word #${wordIndex} (word_id=${word.word_id}): ` +
            `raw_text=${JSON.stringify(word.raw_text)} → rendered=${JSON.stringify(word.text)}`,
        );
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Verbatim guard violated: the format pass changed ${violations.length} ` +
        `word(s) whose characters must match raw_text (A11 — no fabrication of ` +
        `the spoken record):\n${violations.join("\n")}`,
    );
  }
}

// A single fixture exercising every lexical-substitution mechanism the format
// pass historically applied: context-gated token swap (Mr. Peterson→Bentley),
// standalone token swap (K.→Okay.), inline token swap (metastructures→
// ligamentous structures), case-number reshape (C572224L→C-5722-24-L), a
// phrase swap ("what else signs"→"Waddell Signs"), and a genuine F6 stutter
// pair ("the the") that MUST keep its interruption dash.
const SUBSTITUTION_FIXTURE = makeDoc([
  { word_id: "w1", text: "Mr." },
  { word_id: "w2", text: "Peterson" },
  { word_id: "w3", text: "said" },
  { word_id: "w4", text: "K." },
  { word_id: "w5", text: "the" },
  { word_id: "w6", text: "the" },
  { word_id: "w7", text: "metastructures" },
  { word_id: "w8", text: "healed" },
  { word_id: "w9", text: "C572224L" },
  { word_id: "w10", text: "what" },
  { word_id: "w11", text: "else" },
  { word_id: "w12", text: "signs" },
]);

describe("cfe verbatim guard (C1)", () => {
  it("the guard CATCHES the historical leak: default cfe rewrites words", () => {
    // Proves the guard has teeth — default cfe (correction enabled) still
    // substitutes, so the assertion must fail loudly rather than pass blindly.
    const withCorrections = cfe(SUBSTITUTION_FIXTURE, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry);

    expect(() => assertWordsVerbatim(withCorrections)).toThrowError(/Verbatim guard violated/);
    // And the specific dangerous name swap is named in the failure.
    expect(() => assertWordsVerbatim(withCorrections)).toThrowError(/word_id=w2/);
  });

  it("first-render mode preserves every word byte-for-byte", () => {
    const verbatim = cfe(SUBSTITUTION_FIXTURE, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry, {
      applyLexicalCorrections: false,
    });

    expect(() => assertWordsVerbatim(verbatim)).not.toThrow();
  });

  it("first-render mode leaves each substitution trigger unchanged", () => {
    const verbatim = cfe(SUBSTITUTION_FIXTURE, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry, {
      applyLexicalCorrections: false,
    });
    const byId = new Map(
      verbatim.lines.flatMap((line) => line.words).map((word) => [word.word_id, word.text]),
    );

    expect(byId.get("w2")).toBe("Peterson"); // NOT "Bentley"
    expect(byId.get("w4")).toBe("K."); // mid-utterance K. stays verbatim; the ADR-0018 exception is utterance-initial only
    expect(byId.get("w7")).toBe("metastructures"); // NOT "ligamentous structures"
    expect(byId.get("w9")).toBe("C572224L"); // NOT "C-5722-24-L"
    expect(byId.get("w10")).toBe("what"); // phrase swap not applied
    expect(byId.get("w12")).toBe("signs");
  });

  it("first-render mode KEEPS the F6 interruption dash (formatting, not a word change)", () => {
    const verbatim = cfe(SUBSTITUTION_FIXTURE, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry, {
      applyLexicalCorrections: false,
    });
    const w5 = verbatim.lines
      .flatMap((line) => line.words)
      .find((word) => word.word_id === "w5");

    // Structural dash is inserted, but the underlying word is still "the".
    expect(w5?.text).toContain("--");
    expect(w5?.raw_text).toBe("the");
    // ...and the guard still passes, because it strips the permitted dash.
    expect(() => assertWordsVerbatim(verbatim)).not.toThrow();
  });
});

// C1b — the export path is where the worst A11 failure would land: a wrong
// surname substituted after an honorific goes into the DOCX the reporter signs
// her CSR number to, and it looks like a name rather than a bug. This exercises
// stored raw_text -> the render text runs the DOCX is built from, end to end
// through buildCanonicalExportRenderModel.
const EXPORT_FIXTURE = makeDoc([
  { word_id: "w1", text: "Mr." },
  { word_id: "w2", text: "Peterson" },
  { word_id: "w3", text: "examined" },
  { word_id: "w4", text: "K." },
  { word_id: "w5", text: "the" },
  { word_id: "w6", text: "metastructures" },
  { word_id: "w7", text: "today." },
]);

describe("export render model verbatim (C1b)", () => {
  it("never substitutes a source word into the certified DOCX render text", () => {
    const record = emptyCaseRecord("case-verbatim", "2026-07-22T00:00:00.000Z");
    const model = buildCanonicalExportRenderModel(EXPORT_FIXTURE, record);
    const renderText = model.lines.map((line) => line.content).join("\n");

    // Raw words survive into the DOCX text runs...
    expect(renderText).toContain("Peterson");
    expect(renderText).toContain("K.");
    expect(renderText).toContain("metastructures");

    // ...and none of the correction-registry substitutions leak into the
    // artifact the reporter certifies. "Bentley" is the most dangerous: it is a
    // real, plausible surname the audio never contained.
    expect(renderText).not.toContain("Bentley");
    expect(renderText).not.toContain("Okay.");
    expect(renderText).not.toContain("ligamentous structures");
  });
});

// ADR-0018 (DRAFT) — a WHOLE standalone utterance transcribed as "K." / "k." is
// a recognized ASR artifact for the spoken "Okay." and is the one bounded
// correction permitted inside the verbatim floor. Bounded to a sole-token
// utterance, so longer utterances, exhibit letters, and name initials are never
// touched; those ambiguous cases go to the AI/human correction pipeline.
describe("ADR-0018 — standalone K./k. -> Okay. bounded verbatim exception", () => {
  const render = (doc: EditorDocument, applyLexicalCorrections: boolean) => {
    const formatted = cfe(doc, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry, { applyLexicalCorrections });
    return new Map(formatted.lines.flatMap((line) => line.words).map((word) => [word.word_id, word]));
  };

  it("normalizes a whole standalone 'K.' utterance to 'Okay.' (verbatim render)", () => {
    expect(render(makeDoc([{ word_id: "w1", text: "K." }]), false).get("w1")?.text).toBe("Okay.");
  });

  it("normalizes a whole standalone lowercase 'k.' utterance to 'Okay.'", () => {
    expect(render(makeDoc([{ word_id: "w1", text: "k." }]), false).get("w1")?.text).toBe("Okay.");
  });

  it("applies in the corrected render too", () => {
    expect(render(makeDoc([{ word_id: "w1", text: "K." }]), true).get("w1")?.text).toBe("Okay.");
  });

  it("does NOT convert a leading 'K.' in a longer utterance ('K. And then...') — defers to correction pipeline", () => {
    const byId = render(makeDoc([
      { word_id: "w1", text: "K." },
      { word_id: "w2", text: "And" },
      { word_id: "w3", text: "then." },
    ]), false);
    expect(byId.get("w1")?.text).toBe("K.");
  });

  it("does NOT convert a sentence-initial name initial ('K. Smith testified.')", () => {
    const byId = render(makeDoc([
      { word_id: "w1", text: "K." },
      { word_id: "w2", text: "Smith" },
      { word_id: "w3", text: "testified." },
    ]), false);
    expect(byId.get("w1")?.text).toBe("K.");
  });

  it("preserves 'Exhibit K.' and 'Section K.' (letter designations) in both renders", () => {
    for (const gated of [false, true]) {
      const exhibit = render(makeDoc([{ word_id: "e1", text: "Exhibit" }, { word_id: "k1", text: "K." }]), gated);
      expect(exhibit.get("k1")?.text).toBe("K.");
      const section = render(makeDoc([{ word_id: "s1", text: "Section" }, { word_id: "k1", text: "K." }]), gated);
      expect(section.get("k1")?.text).toBe("K.");
    }
  });

  it("preserves name initials — 'John K. Smith' and 'Mr. K. Smith'", () => {
    for (const gated of [false, true]) {
      const john = render(makeDoc([
        { word_id: "j", text: "John" }, { word_id: "k", text: "K." }, { word_id: "s", text: "Smith" },
      ]), gated);
      expect(john.get("k")?.text).toBe("K.");
      const mr = render(makeDoc([
        { word_id: "m", text: "Mr." }, { word_id: "k", text: "K." }, { word_id: "s", text: "Smith" },
      ]), gated);
      expect(mr.get("k")?.text).toBe("K.");
    }
  });

  it("leaves a bare 'K' without a period unchanged (rule is scoped to the 'K.'/'k.' token)", () => {
    expect(render(makeDoc([{ word_id: "w1", text: "K" }]), false).get("w1")?.text).toBe("K");
  });

  it("is idempotent — an already-normalized 'Okay.' is unchanged", () => {
    expect(render(makeDoc([{ word_id: "w1", text: "Okay." }]), false).get("w1")?.text).toBe("Okay.");
  });

  it("preserves raw_text (Deepgram evidence); only the presentation layer normalizes", () => {
    const doc = makeDoc([{ word_id: "w1", text: "K." }]);
    const byId = render(doc, false);
    expect(byId.get("w1")?.text).toBe("Okay.");     // render canonicalizes
    expect(byId.get("w1")?.raw_text).toBe("K.");    // ...raw evidence in the render model is untouched
    expect(doc.words[0].raw_text).toBe("K.");        // ...and the source document is not mutated
  });

  it("reaches the certified export render (approved to appear in the DOCX)", () => {
    const record = emptyCaseRecord("case-k", "2026-07-22T00:00:00.000Z");
    const model = buildCanonicalExportRenderModel(makeDoc([{ word_id: "w1", text: "K." }]), record);
    const renderText = model.lines.map((line) => line.content).join("\n");
    expect(renderText).toContain("Okay.");
  });
});
