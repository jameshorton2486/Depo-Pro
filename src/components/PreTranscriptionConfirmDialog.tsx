interface PreTranscriptionConfirmDialogProps {
  open: boolean;
  caseIdentity: {
    caseId: string;
    caseName: string | null;
    caseStyle: string | null;
    witnessName: string | null;
  };
  audio: {
    filename: string;
    durationSeconds: number | null;
    mimeType: string | null;
  } | null;
  keyterms: {
    count: number;
    estimatedTokens: number;
    sample: string[];
  };
  onConfirm: () => void;
  onCancel: () => void;
}

function renderValue(value: string | null): string {
  return value && value.trim().length > 0 ? value : "—";
}

export function PreTranscriptionConfirmDialog({
  open,
  caseIdentity,
  audio,
  keyterms,
  onConfirm,
  onCancel,
}: PreTranscriptionConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pre-transcription-confirm-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/60"
        onClick={onCancel}
        data-testid="pre-transcription-confirm-backdrop"
      />
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Stage 2</p>
          <h2 id="pre-transcription-confirm-title" className="mt-2 text-xl font-semibold text-slate-900">
            Confirm transcription inputs
          </h2>
        </div>

        <div className="space-y-4 px-6 py-6">
          <section data-testid="pre-transcription-confirm-case" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Case</p>
            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <dt className="font-semibold text-slate-900">Case Name</dt>
                <dd>{renderValue(caseIdentity.caseName)}</dd>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <dt className="font-semibold text-slate-900">Case Style</dt>
                <dd>{renderValue(caseIdentity.caseStyle)}</dd>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <dt className="font-semibold text-slate-900">Witness</dt>
                <dd>{renderValue(caseIdentity.witnessName)}</dd>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <dt className="font-semibold text-slate-900">Case ID</dt>
                <dd className="font-mono text-xs text-slate-600">{caseIdentity.caseId}</dd>
              </div>
            </dl>
          </section>

          <section data-testid="pre-transcription-confirm-audio" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Audio</p>
            {audio ? (
              <>
                <p className="mt-3 text-sm font-semibold text-slate-900">{audio.filename}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {audio.mimeType || "—"}
                  {audio.durationSeconds != null ? ` · ${audio.durationSeconds.toFixed(1)}s` : ""}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm font-semibold text-rose-700">No audio attached</p>
            )}
          </section>

          <section data-testid="pre-transcription-confirm-keyterms" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Keyterms to be sent</p>
            <p className="mt-3 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">{keyterms.count} terms</span>
              {" · "}
              <span className="font-semibold text-slate-900">~{keyterms.estimatedTokens} tokens</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {keyterms.sample.map((term) => (
                <span
                  key={term}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {term}
                </span>
              ))}
            </div>
          </section>

          <p className="text-sm text-slate-600">
            Verify the audio belongs to this case. Transcription cannot be un-sent.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            data-testid="pre-transcription-confirm-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!audio}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            data-testid="pre-transcription-confirm-start"
          >
            Start transcription
          </button>
        </div>
      </div>
    </div>
  );
}

export type { PreTranscriptionConfirmDialogProps };
