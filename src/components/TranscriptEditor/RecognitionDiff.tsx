import { useMemo } from "react";
import type { JSONContent } from "@tiptap/core";
import type { EditorDocument } from "../../api/types";
import type { CaseRecord } from "../../types/case";
import { buildEditorContent } from "../../lib/buildEditorContent";
import { baselineToLabeledLines } from "../../lib/transcript/buildBaselineContent";
import { useDocument } from "../../context/DocumentContext";
import { useEditorContext } from "../../context/EditorContext";

interface RecognitionDiffProps {
  document: EditorDocument;
  record: CaseRecord | null;
  onClose: () => void;
}

// Flatten built TipTap content into readable, prefix-labeled lines.
// Skips non-utterance blocks (e.g. pageBreak).
function contentToLabeledLines(content: JSONContent): string[] {
  const lines: string[] = [];
  (content.content ?? []).forEach((block) => {
    if (block.type !== "utterance") return;
    const attrs = (block.attrs ?? {}) as Record<string, unknown>;
    const prefix =
      (typeof attrs.prefix_text === "string" && attrs.prefix_text) ||
      (typeof attrs.speaker_label === "string" && attrs.speaker_label) ||
      "";
    const text = (block.content ?? [])
      .map((node) => (typeof node.text === "string" ? node.text : ""))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    const line = prefix ? `${prefix} ${text}`.trim() : text;
    if (line.length > 0) lines.push(line);
  });
  return lines;
}

export function RecognitionDiff({ document, record, onClose }: RecognitionDiffProps) {
  const { state } = useDocument();
  const { languageMap } = useEditorContext();
  const baselineLines = useMemo(() => baselineToLabeledLines(document), [document]);

  // Build the "Reporter View" column with the SAME options the live editor uses
  // (session structure flags + languageMap), so the diff shows the transcript the
  // reporter actually sees in the workspace — not an idealized full-inference view.
  const processedLines = useMemo(() => {
    const content = buildEditorContent(document, {
      languageMap,
      structureConfirmed: state.structureConfirmed,
      keepRawLabels: state.keepRawLabels,
      record,
    });
    return contentToLabeledLines(content);
  }, [document, record, languageMap, state.structureConfirmed, state.keepRawLabels]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Recognition versus current comparison"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Recognition Evidence vs. Reporter View
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Left is exactly what Deepgram returned. Right is the working transcript
              the pipeline produced. Differences are changes the pipeline made — not Deepgram.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-slate-200">
          <DiffColumn
            title="Recognition Evidence"
            subtitle={`${baselineLines.length} utterances · raw_text · immutable`}
            lines={baselineLines}
          />
          <DiffColumn
            title="Reporter View"
            subtitle={`${processedLines.length} lines · working transcript`}
            lines={processedLines}
          />
        </div>
      </div>
    </div>
  );
}

function DiffColumn({
  title,
  subtitle,
  lines,
}: {
  title: string;
  subtitle: string;
  lines: string[];
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">{title}</p>
        <p className="text-[11px] text-slate-400">{subtitle}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <ol className="space-y-1">
          {lines.map((line, i) => (
            <li
              key={i}
              className="whitespace-pre-wrap font-mono text-[12px] leading-5 text-slate-700"
            >
              {line}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
