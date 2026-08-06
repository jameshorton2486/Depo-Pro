import { useState } from "react";

import { workspaceApi } from "../../api/workspaceService";

interface AIReviewBannerProps {
  jobId?: string | null;
  pendingCount: number;
  autoAppliedCount: number;
  isRunning?: boolean;
}

export function AIReviewBanner({
  jobId,
  pendingCount,
  autoAppliedCount,
  isRunning = false,
}: AIReviewBannerProps) {
  const [reReviewing, setReReviewing] = useState(false);

  const hasResults = pendingCount > 0 || autoAppliedCount > 0;

  // Idle with no job to act on: there is nothing to trigger, so render nothing.
  // Previously this guard also fired whenever a fresh transcript had zero
  // suggestions — which hid the only control that *generates* suggestions,
  // making it unreachable by construction. The AI-review trigger must stay
  // visible in the idle state so the reporter can start a review.
  if (!isRunning && !hasResults && !jobId) {
    return null;
  }

  const title = isRunning
    ? "AI review in progress"
    : pendingCount > 0
      ? "AI suggestions ready for review"
      : autoAppliedCount > 0
        ? "AI review applied high-confidence corrections"
        : "AI review";
  const detail = isRunning
    ? "Depo-Pro is evaluating flagged transcript tokens and speaker labels."
    : pendingCount > 0
      ? `${pendingCount} suggestion${pendingCount === 1 ? "" : "s"} need review. ${autoAppliedCount} auto-applied.`
      : autoAppliedCount > 0
        ? `${autoAppliedCount} high-confidence correction${autoAppliedCount === 1 ? "" : "s"} were auto-applied.`
        : "Run an AI review to surface suggested corrections and speaker labels for this transcript.";

  async function handleReReview() {
    if (!jobId) {
      return;
    }

    setReReviewing(true);
    try {
      await workspaceApi.triggerAIReview(jobId);
    } catch (error) {
      console.error("[AIReviewBanner] re-review failed", error);
    } finally {
      setReReviewing(false);
    }
  }

  return (
    <div
      data-testid="ai-review-banner"
      className="mx-6 mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
        </div>
        {jobId && (
          <button
            type="button"
            onClick={() => void handleReReview()}
            disabled={reReviewing}
            className="shrink-0 text-[10px] text-blue-600 underline transition-colors hover:text-blue-800 disabled:opacity-50"
          >
            {reReviewing ? "Running AI Review..." : "Run AI Review"}
          </button>
        )}
      </div>
    </div>
  );
}
