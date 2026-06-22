import { Node, mergeAttributes } from "@tiptap/core";
import type { Speaker } from "../api/types";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { getBlockRole } from "../editor/pagination";
import { formatUtteranceTimeTitle, getUtterancePrefix } from "../editor/utteranceRender";

export const UtteranceNode = Node.create({
  name: "utterance",
  group: "block",
  content: "inline*",

  addAttributes() {
    return {
      utterance_id:     { default: null },
      speaker_id:       { default: null },
      speaker_label:    { default: "" },
      prefix_text:      { default: "" },
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
      prefix_text,
      line_number,
      page_line_number,
      start_time,
      role,
      language,
    } = HTMLAttributes as Record<string, unknown>;

    const numericStartTime = typeof start_time === "number" ? start_time : 0;
    const numericLineNumber = typeof line_number === "number" ? line_number : 0;
    const numericPageLineNumber = typeof page_line_number === "number" ? page_line_number : 0;
    const speakerLabelText = typeof speaker_label === "string" ? speaker_label : "";
    const roleValue =
      role === null || role === undefined ? null : (String(role) as Speaker["role"]);
    const languageValue = typeof language === "string" ? language : null;
    const blockRole = getBlockRole(roleValue);
    const isInterpreter = roleValue === "INTERPRETER";
    const displayLine = numericPageLineNumber > 0 ? numericPageLineNumber : numericLineNumber;
    const explicitPrefix = typeof prefix_text === "string" ? prefix_text : "";
    const prefix = explicitPrefix || getUtterancePrefix(roleValue, speakerLabelText);
    const className = [
      "utterance-block",
      `utterance-block--${blockRole.toLowerCase()}`,
      isInterpreter ? "utterance-block--interpreter" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const specParts: unknown[] = [
      "div",
      mergeAttributes({
        class: className,
        "data-utterance-id": utterance_id,
        "data-speaker-id": speaker_id,
        "data-speaker-label": speaker_label,
        "data-line": line_number,
        "data-page-line": page_line_number,
        "data-start": start_time,
        "data-role": role,
        "data-lang": language,
      }),
      [
        "span",
        {
          class: "utt-line-num",
          contenteditable: "false",
          title: formatUtteranceTimeTitle(numericStartTime),
        },
        String(displayLine),
      ],
      [
        "span",
        {
          class: `utt-prefix ${blockRole === "COLLOQUY" ? "utt-prefix--colloquy" : "utt-prefix--qa"}`,
          contenteditable: "false",
        },
        prefix,
      ],
      ["span", { class: "utt-content" }, 0],
    ];

    if (isInterpreter) {
      specParts.push([
        "span",
        {
          class: "utt-interp-channel",
          contenteditable: "false",
          title: `Language: ${languageValue ?? "unknown"}`,
        },
        languageValue ?? "??",
      ]);
    }

    return specParts as unknown as DOMOutputSpec;
  },
});
