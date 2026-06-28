interface AIReviewBannerProps {
  pendingCount: number;
  autoAppliedCount: number;
  isRunning?: boolean;
}

export function AIReviewBanner({
  pendingCount,
  autoAppliedCount,
  isRunning = false,
}: AIReviewBannerProps) {
  if (!isRunning && pendingCount === 0 && autoAppliedCount === 0) {
    return null;
  }

  const title = isRunning
    ? "AI review in progress"
    : pendingCount > 0
      ? "AI suggestions ready for review"
      : "AI review applied high-confidence corrections";
  const detail = isRunning
    ? "Depo-Pro is evaluating flagged transcript tokens and speaker labels."
    : pendingCount > 0
      ? `${pendingCount} suggestion${pendingCount === 1 ? "" : "s"} need review. ${autoAppliedCount} auto-applied.`
      : `${autoAppliedCount} high-confidence correction${autoAppliedCount === 1 ? "" : "s"} were auto-applied.`;

  return (
    <div
      data-testid="ai-review-banner"
      className="mx-6 mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4"
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}
