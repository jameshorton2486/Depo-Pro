import { useState } from "react";
import type { EditorDocument } from "../../api/types";
import { useDocument, type RenderLayer } from "../../context/DocumentContext";
import { useIntake } from "../../context/useIntake";
import { RecognitionDiff } from "./RecognitionDiff";

// The DTAS pipeline stages between Recognition Evidence and the Reporter View.
// Only the two endpoints are individually renderable today; the intermediate
// stages are not yet isolated as addressable snapshots (that is the next build
// phase — each stage emits a document + a reversible, explainable change-set).
const PIPELINE_STAGES: Array<{ key: string; label: string; note: string }> = [
  { key: "normalization", label: "Normalization", note: "Canonical speakers, utterances, stable IDs" },
  { key: "speaker_mapping", label: "Speaker Mapping", note: "Speaker 0 → identified participant" },
  { key: "semantic", label: "Semantic", note: "Q/A, colloquy, section structure" },
  { key: "editorial", label: "Editorial", note: "Filler removal, punctuation, corrections" },
  { key: "formatting", label: "Formatting", note: "Legal indentation, wrapping, spacing" },
  { key: "pagination", label: "Pagination", note: "25-line transcript-page geometry" },
];

interface TranscriptProcessingMenuProps {
  document: EditorDocument | null;
}

export function TranscriptProcessingMenu({ document }: TranscriptProcessingMenuProps) {
  const { state, setRenderLayer } = useDocument();
  const { record } = useIntake();
  const [open, setOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);

  const active = state.renderLayer;

  const select = (layer: RenderLayer) => {
    setRenderLayer(layer);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="pipeline-inspector-trigger"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <span
          className={`h-2 w-2 rounded-full ${active === "recognition" ? "bg-amber-500" : "bg-emerald-500"}`}
          aria-hidden
        />
        Inspect Pipeline
        {active === "recognition" && (
          <span className="text-xs font-normal text-amber-600">Recognition Evidence</span>
        )}
      </button>

      {open && (
        <>
          {/* click-away */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
            role="menu"
          >
            <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              View · session only
            </p>

            <LayerChoice
              label="Reporter View"
              note="The working transcript you edit — the default surface"
              selected={active === "reporter"}
              tone="emerald"
              onClick={() => select("reporter")}
            />
            <LayerChoice
              label="Recognition Evidence"
              note="Immutable Deepgram output · read-only · no transformations"
              selected={active === "recognition"}
              tone="amber"
              onClick={() => select("recognition")}
            />

            <div className="my-2 border-t border-slate-100" />

            <button
              type="button"
              disabled={!document}
              onClick={() => {
                setDiffOpen(true);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              role="menuitem"
            >
              Compare layers
              <span aria-hidden>→</span>
            </button>

            <div className="my-2 border-t border-slate-100" />

            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Pipeline stages · isolation in progress
            </p>
            <ul className="space-y-0.5">
              {PIPELINE_STAGES.map((stage) => (
                <li
                  key={stage.key}
                  className="flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 opacity-50"
                  title="Not yet isolated as an addressable layer"
                >
                  <span className="text-sm text-slate-600">
                    {stage.label}
                    <span className="block text-[11px] text-slate-400">{stage.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {diffOpen && document && (
        <RecognitionDiff document={document} record={record ?? null} onClose={() => setDiffOpen(false)} />
      )}
    </div>
  );
}

function LayerChoice({
  label,
  note,
  selected,
  tone,
  onClick,
}: {
  label: string;
  note: string;
  selected: boolean;
  tone: "emerald" | "amber";
  onClick: () => void;
}) {
  const dot = tone === "amber" ? "border-amber-500 bg-amber-500" : "border-emerald-500 bg-emerald-500";
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitemradio"
      aria-checked={selected}
      className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50 ${
        selected ? "bg-slate-50" : ""
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          selected ? dot : "border-slate-300"
        }`}
        aria-hidden
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        <span className="block text-[11px] text-slate-400">{note}</span>
      </span>
    </button>
  );
}
