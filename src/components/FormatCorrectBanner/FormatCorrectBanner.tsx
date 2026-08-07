import { useState } from "react";

import { workspaceApi } from "../../api/workspaceService";
import { useDocument } from "../../context/DocumentContext";

interface FormatCorrectBannerProps {
  jobId?: string | null;
}

// ADR-0016 — the single "Format and Correct Transcript" entry point.
// A confirmed press runs the deterministic pipeline (P-A) over the reporter's
// corrected text via save → reload, then triggers an AI review (P-B). The
// confirmation is mandatory: the reload resets cursor/scroll position, so the
// reporter must consent to losing her place before it happens.
export function FormatCorrectBanner({ jobId }: FormatCorrectBannerProps) {
  const { state, confirmStructure, keepRawLabels, saveNow, loadDocument } = useDocument();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const structureConfirmed = state.structureConfirmed;
  const disabled = !state.document || state.saving || busy;

  async function run(keepRaw: boolean) {
    setBusy(true);
    setError(null);
    try {
      // Structure decision is one-time. Once confirmed, later presses just
      // re-format; they neither re-confirm nor offer the raw-labels choice.
      if (!structureConfirmed) {
        if (keepRaw) keepRawLabels();
        else confirmStructure();
      }

      // Save MUST gate the reload (ADR-0016). A failed save followed by a
      // reload would fetch server state without the unsaved corrections and
      // silently discard them.
      const saved = await saveNow();
      if (!saved) {
        setError("Couldn't save your corrections, so nothing was reformatted. Please try again.");
        return;
      }

      await loadDocument();

      // AI review is best-effort: a failure must not undo the completed
      // format + reload. Surface it non-fatally.
      if (jobId) {
        try {
          await workspaceApi.triggerAIReview(jobId);
        } catch (aiError) {
          console.error("[FormatCorrectBanner] AI review trigger failed", aiError);
        }
      }

      setDialogOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      data-testid="format-correct-banner"
      className="mx-6 mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {structureConfirmed ? "Format and correct transcript" : "Review inferred structure"}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {structureConfirmed
              ? "Save your corrections, reformat the transcript, and run an AI review."
              : "Depo-Pro inferred speaker roles and Q./A. structure. Format and correct to apply it, save your corrections, and run an AI review."}
          </p>
        </div>
        <button
          type="button"
          data-testid="format-correct-trigger"
          onClick={() => {
            setError(null);
            setDialogOpen(true);
          }}
          disabled={disabled}
          className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Format and Correct Transcript
        </button>
      </div>

      {dialogOpen && (
        <FormatCorrectDialog
          structureConfirmed={structureConfirmed}
          busy={busy}
          error={error}
          onFormat={() => void run(false)}
          onKeepRaw={() => void run(true)}
          onCancel={() => {
            if (!busy) setDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}

interface FormatCorrectDialogProps {
  structureConfirmed: boolean;
  busy: boolean;
  error: string | null;
  onFormat: () => void;
  onKeepRaw: () => void;
  onCancel: () => void;
}

function FormatCorrectDialog({
  structureConfirmed,
  busy,
  error,
  onFormat,
  onKeepRaw,
  onCancel,
}: FormatCorrectDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Format and correct transcript"
      data-testid="format-correct-dialog"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-semibold text-slate-900">Format and correct this transcript?</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This saves your corrections, reformats the transcript, and runs an AI review.
        </p>
        <p className="mt-2 text-sm font-medium leading-6 text-amber-700">
          Your place in the document (cursor and scroll position) will be lost.
        </p>

        {!structureConfirmed && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
            Depo-Pro inferred speaker roles and Q./A. structure. Choose{" "}
            <span className="font-semibold">Format and Correct</span> to apply it, or{" "}
            <span className="font-semibold">Keep Raw Labels</span> to keep the provider&rsquo;s
            original speaker labels.
          </p>
        )}

        {error && (
          <p
            data-testid="format-correct-error"
            className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            data-testid="format-correct-cancel"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          {!structureConfirmed && (
            <button
              type="button"
              data-testid="format-correct-keep-raw"
              onClick={onKeepRaw}
              disabled={busy}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Keep Raw Labels
            </button>
          )}
          <button
            type="button"
            data-testid="format-correct-confirm"
            onClick={onFormat}
            disabled={busy}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? "Working…" : "Format and Correct"}
          </button>
        </div>
      </div>
    </div>
  );
}
