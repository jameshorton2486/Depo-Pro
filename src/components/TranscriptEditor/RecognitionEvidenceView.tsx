import { useMemo } from "react";
import type { EditorDocument } from "../../api/types";
import { buildBaselineRows, type ConfidenceLevel } from "../../lib/transcript/buildBaselineContent";
import { useAudio } from "../../context/AudioContext";

interface RecognitionEvidenceViewProps {
  document: EditorDocument | null;
}

function confClass(level: ConfidenceLevel): string {
  if (level === "very-low") return "word-very-low-conf";
  if (level === "low") return "word-low-conf";
  return "";
}

// Read-only render of immutable Deepgram recognition ("Recognition Evidence").
//
// This renders OUTSIDE the editable TipTap editor on purpose: recognition must
// never reach the reporter's working-text or autosave pipeline. It is evidence,
// not a draft — there is no editing, no context menu, no suggestion application.
// Confidence coloring and click-to-seek are preserved.
export function RecognitionEvidenceView({ document }: RecognitionEvidenceViewProps) {
  const audio = useAudio();
  const rows = useMemo(() => (document ? buildBaselineRows(document) : []), [document]);

  if (!document) return null;

  return (
    <div className="evidence-view" data-testid="recognition-evidence-view">
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
