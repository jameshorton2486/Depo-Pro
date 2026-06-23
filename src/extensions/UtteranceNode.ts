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
      utterance_id: { default: null },
      speaker_id: { default: null },
      speaker_label: { default: "" },
      prefix_text: { default: "" },
      line_number: { default: 0 },
      page_line_number: { default: 0 },
      start_time: { default: 0 },
      role: { default: null },
      language: { default: null },
      indent_intent: { default: null },
      continuation_mode: { default: null },
      format_box_width_inches: { default: null },
      left_margin_inches: { default: null },
      right_margin_inches: { default: null },
      line_spacing_points: { default: null },
      tab_qa_label_inches: { default: null },
      tab_qa_text_inches: { default: null },
      tab_speaker_inches: { default: null },
      tab_parenthetical_inches: { default: null },
      tab_center_inches: { default: null },
      tab_continuation_inches: { default: null },
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
      indent_intent,
      continuation_mode,
      format_box_width_inches,
      left_margin_inches,
      right_margin_inches,
      line_spacing_points,
      tab_qa_label_inches,
      tab_qa_text_inches,
      tab_speaker_inches,
      tab_parenthetical_inches,
      tab_center_inches,
      tab_continuation_inches,
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
        "data-indent-intent": indent_intent,
        "data-continuation-mode": continuation_mode,
        "data-format-box-width-inches": format_box_width_inches,
        "data-left-margin-inches": left_margin_inches,
        "data-right-margin-inches": right_margin_inches,
        "data-line-spacing-points": line_spacing_points,
        "data-tab-qa-label-inches": tab_qa_label_inches,
        "data-tab-qa-text-inches": tab_qa_text_inches,
        "data-tab-speaker-inches": tab_speaker_inches,
        "data-tab-parenthetical-inches": tab_parenthetical_inches,
        "data-tab-center-inches": tab_center_inches,
        "data-tab-continuation-inches": tab_continuation_inches,
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
