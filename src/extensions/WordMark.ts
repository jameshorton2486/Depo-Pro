import { Mark, mergeAttributes } from "@tiptap/core";

// WordMark carries per-word ASR metadata as a ProseMirror mark.
// The DOM span gets data-* attributes for click-to-seek and RAF highlight toggling.
// NEVER write to raw_text; that field is not stored on this mark.
export const WordMark = Mark.create({
  name: "wordMark",
  priority: 1000,

  // Marks of the same type with different attrs are not merged by ProseMirror,
  // because each word_id is unique. No extra configuration needed.

  addAttributes() {
    return {
      word_id: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-word-id"),
      },
      utterance_id: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-utt"),
      },
      speaker_id: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-spk"),
      },
      start_time: {
        default: 0,
        parseHTML: (el) => parseFloat(el.getAttribute("data-start") ?? "0"),
      },
      end_time: {
        default: 0,
        parseHTML: (el) => parseFloat(el.getAttribute("data-end") ?? "0"),
      },
      confidence: {
        default: 1,
        parseHTML: (el) => parseFloat(el.getAttribute("data-conf") ?? "1"),
      },
      reviewed: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-reviewed") === "true",
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-word-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const {
      word_id,
      utterance_id,
      speaker_id,
      start_time,
      end_time,
      confidence,
      reviewed,
    } = HTMLAttributes as {
      word_id: string;
      utterance_id: string;
      speaker_id: string;
      start_time: number;
      end_time: number;
      confidence: number;
      reviewed: boolean;
    };

    const conf = typeof confidence === "number" ? confidence : 1;
    const confClass =
      conf < 0.5
        ? "word-very-low-conf"
        : conf < 0.75
        ? "word-low-conf"
        : "";

    return [
      "span",
      mergeAttributes({
        "data-word-id": word_id,
        "data-utt": utterance_id,
        "data-spk": speaker_id,
        "data-start": start_time,
        "data-end": end_time,
        "data-conf": confidence,
        "data-reviewed": String(reviewed),
        class: ["word-token", confClass, reviewed ? "word-reviewed" : ""]
          .filter(Boolean)
          .join(" "),
      }),
      0, // contentDOM hole
    ];
  },
});
