interface RetranscriptionConfirmDialogProps {
  open: boolean;
  transcriptId: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RetranscriptionConfirmDialog({
  open,
  transcriptId,
  onCancel,
  onConfirm,
}: RetranscriptionConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
      <div
        data-testid="retranscription-confirm-dialog"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Retranscribe Audio</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Replace the current transcript?</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Retranscription runs the current transcription pipeline and <span className="font-semibold text-slate-900">replaces</span> this
          case&rsquo;s transcript. Once the new transcript completes, the existing one is permanently
          removed so the case keeps a single transcript. This cannot be undone.
        </p>
        {transcriptId && (
          <p
            data-testid="retranscription-confirm-source"
            className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          >
            Source transcript: <span className="font-semibold text-slate-900">{transcriptId}</span>
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            data-testid="retranscription-confirm-cancel"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="retranscription-confirm-start"
            onClick={onConfirm}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Retranscribe
          </button>
        </div>
      </div>
    </div>
  );
}
