import { useMemo } from "react";
import type React from "react";
import type { EditorDocument } from "../../api/types";
import { buildBaselineRows, type ConfidenceLevel } from "../../lib/transcript/buildBaselineContent";
import { useAudio } from "../../context/AudioContext";

interface CanonicalBaselineViewProps {
  document: EditorDocument | null;
  // Root element ref, so the audio follow-along loop can query this view's word
  // nodes (the editable editor is unmounted in canonical mode).
  rootRef?: React.Ref<HTMLDivElement>;
}

function confClass(level: ConfidenceLevel): string {
  if (level === "very-low") return "word-very-low-conf";
  if (level === "low") return "word-low-conf";
  return "";
}

// Read-only render of the Canonical Baseline (Layer 0 as far as the workspace
// can see it).
//
// NOTE ON NAMING: this shows per-word raw_text verbatim, but the underlying
// document is the CANONICAL transcript — already normalized/merged server-side.
// The raw pre-normalization Deepgram payload is not available client-side, so
// this is "Canonical Baseline" (Recognition + Normalization), not pure
// Recognition. A true Recognition layer arrives once raw responses are exposed.
//
// It renders OUTSIDE the editable TipTap editor on purpose: the baseline must
// never reach the reporter's working-text or autosave pipeline. It is evidence,
// not a draft — no editing, no context menu, no suggestion application.
// Confidence coloring and click-to-seek are preserved.
export function CanonicalBaselineView({ document, rootRef }: CanonicalBaselineViewProps) {
  const audio = useAudio();
  const rows = useMemo(() => (document ? buildBaselineRows(document) : []), [document]);

  if (!document) return null;

  return (
    <div ref={rootRef} className="evidence-view" data-testid="canonical-baseline-view">
      {rows.map((row) => (
        <div key={row.utterance_id} className="evidence-row">
          <span className="evidence-speaker" contentEditable={false}>
            {row.speaker_label}:
          </span>{" "}
          <span className="evidence-text">
            {row.words.map((w, i) => (
              <span key={w.word_id}>
                <span
                  className={["word-token", confClass(w.confidenceLevel)].filter(Boolean).join(" ")}
                  data-word-id={w.word_id}
                  data-start={w.start_time}
                  data-conf={w.confidence}
                  role="button"
                  tabIndex={0}
                  title={`Confidence: ${Math.round(w.confidence * 100)}% · click to play`}
                  onClick={() => {
                    audio.seekTo(w.start_time);
                    audio.play();
                  }}
                >
                  {w.text}
                </span>
                {i < row.words.length - 1 ? " " : ""}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
