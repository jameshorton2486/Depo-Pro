import { Node, mergeAttributes } from "@tiptap/core";
import type { Speaker } from "../api/types";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import type { BlockRole } from "../editor/pagination";
import { formatUtteranceTimeTitle } from "../editor/utteranceRender";
import { colloquyLabel, COLON_GAP } from "../editor/stageS/colloquy";

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
      display_mode:     { default: "COLLOQUY" },
      display_label:    { default: "" },
      display_heading:  { default: null },
      display_by_line:  { default: null },
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
      display_mode,
      display_label,
      display_heading,
      display_by_line,
    } = HTMLAttributes as Record<string, unknown>;

    const numericStartTime = typeof start_time === "number" ? start_time : 0;
    const numericLineNumber = typeof line_number === "number" ? line_number : 0;
    const numericPageLineNumber = typeof page_line_number === "number" ? page_line_number : 0;
    const speakerLabelText = typeof speaker_label === "string" ? speaker_label : "";
    const roleValue =
      role === null || role === undefined ? null : (String(role) as Speaker["role"]);
    const languageValue = typeof language === "string" ? language : null;
    const blockRole = parseDisplayMode(display_mode);
    const displayLabelText = typeof display_label === "string" ? display_label : speakerLabelText;
    const displayHeadingText = typeof display_heading === "string" ? display_heading : null;
    const displayByLineText = typeof display_by_line === "string" ? display_by_line : null;
    const isInterpreter = roleValue === "INTERPRETER";
    const displayLine = numericPageLineNumber > 0 ? numericPageLineNumber : numericLineNumber;
    const className = [
      "utterance-block",
      `utterance-block--${blockRole.toLowerCase()}`,
      isInterpreter ? "utterance-block--interpreter" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const blockAttrs = mergeAttributes({
      class: className,
      "data-utterance-id": utterance_id,
      "data-speaker-id": speaker_id,
      "data-speaker-label": speaker_label,
      "data-line": line_number,
      "data-page-line": page_line_number,
      "data-start": start_time,
      "data-role": role,
      "data-lang": language,
      "data-display-mode": display_mode,
      "data-display-label": display_label,
    });

    const lineNumberSpec: unknown[] = [
      "span",
      {
        class: "utt-line-num",
        contenteditable: "false",
        title: formatUtteranceTimeTitle(numericStartTime),
      },
      String(displayLine),
    ];

    const specParts: unknown[] = ["div", blockAttrs, lineNumberSpec];
    const structuralLines: unknown[] = [];

    if (displayHeadingText) {
      structuralLines.push([
        "div",
        {
          class: "utt-structural utt-structural--heading",
          contenteditable: "false",
        },
        displayHeadingText,
      ]);
    }

    if (displayByLineText) {
      structuralLines.push([
        "div",
        {
          class: "utt-structural utt-structural--byline",
          contenteditable: "false",
        },
        displayByLineText,
      ]);
    }

    if (structuralLines.length > 0) {
      specParts.splice(2, 0, ...structuralLines);
    }

    if (blockRole === "COLLOQUY") {
      specParts.push([
        "span",
        {
          class: "utt-colloquy-line",
        },
        [
          "span",
          {
            class: "utt-prefix utt-prefix--colloquy",
            contenteditable: "false",
          },
          `${colloquyLabel(displayLabelText)}${COLON_GAP}`,
        ],
        ["span", { class: "utt-content utt-content--colloquy" }, 0],
      ]);
    } else if (blockRole === "PARENTHETICAL") {
      specParts.push([
        "span",
        {
          class: "utt-parenthetical-line",
        },
        ["span", { class: "utt-content utt-content--parenthetical" }, 0],
      ]);
    } else {
      const prefix = blockRole === "Q" ? "Q." : "A.";
      specParts.push(
        [
          "span",
          {
            class: "utt-prefix utt-prefix--qa",
            contenteditable: "false",
          },
          prefix,
        ],
        ["span", { class: "utt-content" }, 0],
      );
    }

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

function parseDisplayMode(value: unknown): BlockRole | "PARENTHETICAL" {
  if (value === "Q" || value === "A" || value === "COLLOQUY" || value === "PARENTHETICAL") {
    return value;
  }

  return "COLLOQUY";
}
