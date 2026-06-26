interface StructureReviewBannerProps {
  onConfirm: () => void;
  onDismiss: () => void;
}

export function StructureReviewBanner({
  onConfirm,
  onDismiss,
}: StructureReviewBannerProps) {
  return (
    <div
      data-testid="structure-review-banner"
      className="mx-6 mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4"
    >
      <p className="text-sm font-semibold text-slate-900">Review inferred structure</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Depo-Pro has inferred speaker roles and Q./A. structure from this transcript.
        Review and confirm to apply, or dismiss to keep raw speaker labels.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="structure-review-confirm"
          onClick={onConfirm}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Review & Confirm
        </button>
        <button
          type="button"
          data-testid="structure-review-dismiss"
          onClick={onDismiss}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
        >
          Keep Raw Labels
        </button>
      </div>
    </div>
  );
}
