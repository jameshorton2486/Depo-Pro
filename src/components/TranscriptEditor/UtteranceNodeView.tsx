import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { getBlockRole } from "../../editor/pagination";
import type { Speaker } from "../../api/types";

interface UtteranceAttrs {
  utterance_id: string;
  speaker_id: string;
  speaker_label: string;
  line_number: number;
  page_line_number: number;
  start_time: number;
  role: Speaker["role"] | null;
  language: string | null;
}

// Renders one utterance turn in UFM legal-transcript style.
//
// Layout (3-column CSS grid):
//   [line-num 2.5rem] [prefix 3.5rem] [content flex-1]
//
// Q / A utterances: prefix column shows "Q." or "A."
// COLLOQUY: prefix column shows an abbreviated speaker identifier in caps.
// INTERPRETER utterances carry a language tag and get a distinct visual treatment.
export function UtteranceNodeView({ node }: NodeViewProps) {
  const {
    utterance_id,
    speaker_label,
    page_line_number,
    line_number,
    start_time,
    role,
    speaker_id,
    language,
  } = node.attrs as UtteranceAttrs;

  const blockRole = getBlockRole(role);
  const displayLine = page_line_number > 0 ? page_line_number : line_number;
  const isInterpreter = role === "INTERPRETER";

  // Q/A prefix is the 2-char label; colloquy uses an abbreviated speaker name.
  const prefix =
    blockRole === "Q"
      ? "Q."
      : blockRole === "A"
      ? "A."
      : abbreviate(speaker_label);

  const isColloquy = blockRole === "COLLOQUY";

  const classNames = [
    "utterance-block",
    `utterance-block--${blockRole.toLowerCase()}`,
    isInterpreter ? "utterance-block--interpreter" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <NodeViewWrapper
      as="div"
      className={classNames}
      data-utterance-id={utterance_id}
      data-speaker-id={speaker_id}
      data-start={start_time}
      data-lang={language ?? undefined}
    >
      {/* Line number gutter */}
      <span
        className="utt-line-num"
        contentEditable={false}
        suppressContentEditableWarning
        title={`${Math.floor(start_time / 60)}:${String(Math.floor(start_time % 60)).padStart(2, "0")}`}
      >
        {displayLine}
      </span>

      {/* Q. / A. / SPEAKER prefix */}
      <span
        className={`utt-prefix ${isColloquy ? "utt-prefix--colloquy" : "utt-prefix--qa"}`}
        contentEditable={false}
        suppressContentEditableWarning
      >
        {prefix}
      </span>

      {/* Editable word content */}
      <NodeViewContent className="utt-content" />

      {/* Interpreter channel stub — shown only when interpreter layer is visible */}
      {isInterpreter && (
        <span
          className="utt-interp-channel"
          contentEditable={false}
          suppressContentEditableWarning
          title={`Language: ${language ?? "unknown"}`}
        >
          {language ?? "??"}
        </span>
      )}
    </NodeViewWrapper>
  );
}

// Abbreviate a speaker label to ≤10 chars for the prefix column.
// e.g. "THE REPORTER" → "REPORTER", "MR. SMITH" → "MR. SMITH", "PLAINTIFF COUNSEL" → "PL. COUNSEL"
function abbreviate(label: string): string {
  const stripped = label.replace(/^THE\s+/, "").replace(/:$/, "").trim();
  if (stripped.length <= 10) return stripped;
  // Take first two words
  const parts = stripped.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0].slice(0, 3)}. ${parts[1].slice(0, 6)}`;
  }
  return stripped.slice(0, 10);
}
