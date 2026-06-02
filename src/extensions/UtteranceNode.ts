import { Node, mergeAttributes } from "@tiptap/core";

// Block node representing one utterance (speaker turn).
// Speaker label, line numbers, and role are stored as attrs and rendered by the
// React NodeView (UtteranceNodeView.tsx). This extension stays framework-agnostic.
export const UtteranceNode = Node.create({
  name: "utterance",
  group: "block",
  content: "inline*",

  addAttributes() {
    return {
      utterance_id:     { default: null },
      speaker_id:       { default: null },
      speaker_label:    { default: "" },
      // Global 1-based utterance index (used for display when page info absent)
      line_number:      { default: 0 },
      // 1-based line number within the current page (1–25)
      page_line_number: { default: 0 },
      start_time:       { default: 0 },
      // Speaker role determines Q./A./colloquy rendering
      role:             { default: null },
      // UI-only: ISO language tag for interpreter layer ("en" | "es" | null)
      language:         { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-utterance-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const {
      utterance_id,
      speaker_id,
      speaker_label,
      line_number,
      page_line_number,
      start_time,
      role,
      language,
    } = HTMLAttributes as Record<string, unknown>;

    return [
      "div",
      mergeAttributes({
        class: "utterance-block",
        "data-utterance-id": utterance_id,
        "data-speaker-id": speaker_id,
        "data-speaker-label": speaker_label,
        "data-line": line_number,
        "data-page-line": page_line_number,
        "data-start": start_time,
        "data-role": role,
        "data-lang": language,
      }),
      0,
    ];
  },
});
