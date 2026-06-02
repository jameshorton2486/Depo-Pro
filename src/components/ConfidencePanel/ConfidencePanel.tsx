import { useState, useCallback, useEffect } from "react";
import { ShieldCheck, ChevronRight, CheckCircle, RotateCcw } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { useDocument } from "../../context/DocumentContext";
import { useAudio } from "../../context/AudioContext";
import {
  confidencePluginKey,
  getConfidenceState,
  type LowConfWord,
} from "../../extensions/ConfidencePlugin";
import { api } from "../../api/client";

export function ConfidencePanel() {
  const { editor } = useEditorContext();
  const { state: docState, markReviewed, markUnreviewed } = useDocument();
  const audio = useAudio();
  const jobId = docState.document?.job_id ?? "demo";

  // Track current queue index for "Next issue" navigation
  const [queueIdx, setQueueIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  // Pull live state from ProseMirror plugin
  const pluginState = editor ? getConfidenceState(editor.state) : undefined;
  const lowConfWords: LowConfWord[] = pluginState?.lowConfWords ?? [];
  const reviewedIds: Set<string> = pluginState?.reviewedIds ?? new Set();

  // Total low-conf count = queue (unreviewed) + reviewed
  const totalLowConf = lowConfWords.length + reviewedIds.size;
  const reviewedCount = reviewedIds.size;

  // Clamp queue index when queue shrinks
  const clampedIdx = Math.min(queueIdx, Math.max(0, lowConfWords.length - 1));

  // When editor initialises (or document loads), seed plugin with already-reviewed words
  useEffect(() => {
    if (!editor || !docState.document) return;
    const alreadyReviewed = docState.document.words
      .filter((w) => w.reviewed)
      .map((w) => w.word_id);

    if (alreadyReviewed.length === 0) return;

    const tr = editor.state.tr.setMeta(confidencePluginKey, {
      type: "RESET_REVIEWED",
      word_ids: alreadyReviewed,
    });
    editor.view.dispatch(tr);
  }, [editor, docState.document]);

  const navigateTo = useCallback(
    (word: LowConfWord) => {
      // Seek audio
      audio.seekTo(word.start_time);

      // Scroll word into view via DOM query
      const el = document.querySelector<HTMLElement>(
        `[data-word-id="${word.word_id}"]`
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Brief flash highlight
        el.classList.add("word-conf-focus");
        setTimeout(() => el.classList.remove("word-conf-focus"), 1200);
      }
    },
    [audio]
  );

  const handleNext = useCallback(() => {
    if (lowConfWords.length === 0) return;
    const idx = Math.min(clampedIdx, lowConfWords.length - 1);
    navigateTo(lowConfWords[idx]);
  }, [lowConfWords, clampedIdx, navigateTo]);

  const handleMarkReviewed = useCallback(
    async (word: LowConfWord) => {
      if (!editor) return;

      // Update plugin state
      const tr = editor.state.tr.setMeta(confidencePluginKey, {
        type: "SET_REVIEWED",
        word_ids: [word.word_id],
      });
      editor.view.dispatch(tr);

      // Update DocumentContext
      markReviewed([word.word_id]);

      // Persist
      setSaving(true);
      try {
        const newReviewedIds = new Set(reviewedIds);
        newReviewedIds.add(word.word_id);
        await api.saveReview(jobId, {
          reviewed_word_ids: Array.from(newReviewedIds),
          unreviewed_word_ids: [],
        });
      } catch {
        // silent — best-effort
      } finally {
        setSaving(false);
      }

      // Advance index if we reviewed the current word
      if (clampedIdx >= lowConfWords.length - 1) {
        setQueueIdx(Math.max(0, lowConfWords.length - 2));
      }
    },
    [editor, markReviewed, reviewedIds, jobId, clampedIdx, lowConfWords]
  );

  const handleUnreview = useCallback(
    async (wordId: string) => {
      if (!editor) return;

      const tr = editor.state.tr.setMeta(confidencePluginKey, {
        type: "CLEAR_REVIEWED",
        word_ids: [wordId],
      });
      editor.view.dispatch(tr);
      markUnreviewed([wordId]);

      setSaving(true);
      try {
        const newReviewedIds = new Set(reviewedIds);
        newReviewedIds.delete(wordId);
        await api.saveReview(jobId, {
          reviewed_word_ids: Array.from(newReviewedIds),
          unreviewed_word_ids: [wordId],
        });
      } catch {
        // silent
      } finally {
        setSaving(false);
      }
    },
    [editor, markUnreviewed, reviewedIds, jobId]
  );

  const progressPct =
    totalLowConf > 0 ? Math.round((reviewedCount / totalLowConf) * 100) : 100;

  const allDone = lowConfWords.length === 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={13} className="text-amber-600" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Confidence Review
          </h2>
          {!allDone && (
            <span className="ml-auto text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
              {lowConfWords.length}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-500 shrink-0">
            {reviewedCount} / {totalLowConf}
          </span>
        </div>
      </div>

      {/* All done state */}
      {allDone && totalLowConf === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
          <CheckCircle size={32} className="text-emerald-500" />
          <p className="text-sm font-semibold text-slate-700">
            No low-confidence words
          </p>
          <p className="text-xs text-slate-400">
            All words meet the confidence threshold.
          </p>
        </div>
      )}

      {allDone && totalLowConf > 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
          <CheckCircle size={32} className="text-emerald-500" />
          <p className="text-sm font-semibold text-slate-700">Review complete</p>
          <p className="text-xs text-slate-400">
            All {totalLowConf} flagged words have been reviewed.
          </p>
        </div>
      )}

      {/* Queue */}
      {!allDone && (
        <>
          {/* Navigation controls */}
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
            <button
              onClick={handleNext}
              disabled={lowConfWords.length === 0}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-40 transition-colors font-medium"
            >
              <ChevronRight size={13} />
              Next issue
            </button>
            <span className="text-[11px] text-slate-400">
              {clampedIdx + 1} of {lowConfWords.length}
            </span>
            {saving && (
              <span className="ml-auto text-[10px] text-slate-400">
                Saving…
              </span>
            )}
          </div>

          {/* Word list */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {lowConfWords.map((word, idx) => {
              const pct = Math.round(word.confidence * 100);
              const isCurrent = idx === clampedIdx;
              const confColor =
                pct < 55 ? "text-red-600" : pct < 65 ? "text-orange-600" : "text-amber-600";

              return (
                <div
                  key={word.word_id}
                  className={`rounded-lg border px-3 py-2.5 cursor-pointer transition-all ${
                    isCurrent
                      ? "border-blue-300 bg-blue-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  onClick={() => {
                    setQueueIdx(idx);
                    navigateTo(word);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-serif text-sm font-semibold text-slate-800 truncate max-w-[120px]">
                      &ldquo;{word.text}&rdquo;
                    </span>
                    <span className={`text-[11px] font-mono font-bold ${confColor}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {word.start_time.toFixed(1)}s
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkReviewed(word);
                      }}
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors font-medium"
                    >
                      <CheckCircle size={10} />
                      Mark reviewed
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reviewed words (collapsible summary) */}
          {reviewedCount > 0 && (
            <ReviewedSummary
              reviewedIds={reviewedIds}
              wordMap={docState.wordMap}
              onUnreview={handleUnreview}
            />
          )}
        </>
      )}

      {/* Reviewed list when all done but some reviewed */}
      {allDone && totalLowConf > 0 && reviewedCount > 0 && (
        <ReviewedSummary
          reviewedIds={reviewedIds}
          wordMap={docState.wordMap}
          onUnreview={handleUnreview}
          defaultOpen
        />
      )}
    </div>
  );
}

function ReviewedSummary({
  reviewedIds,
  wordMap,
  onUnreview,
  defaultOpen = false,
}: {
  reviewedIds: Set<string>;
  wordMap: Record<string, { word_id: string; text: string; confidence: number }>;
  onUnreview: (wordId: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-slate-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-2 flex items-center gap-2 text-[11px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <CheckCircle size={11} className="text-emerald-500" />
        {reviewedIds.size} reviewed
        <ChevronRight
          size={11}
          className={`ml-auto transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-1">
          {Array.from(reviewedIds).map((wid) => {
            const w = wordMap[wid];
            if (!w) return null;
            const pct = Math.round(w.confidence * 100);
            return (
              <div
                key={wid}
                className="flex items-center justify-between rounded px-2 py-1.5 bg-emerald-50 border border-emerald-100"
              >
                <span className="font-serif text-xs text-slate-700 truncate max-w-[110px]">
                  &ldquo;{w.text}&rdquo;
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-slate-400">{pct}%</span>
                  <button
                    onClick={() => onUnreview(wid)}
                    className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Undo review"
                  >
                    <RotateCcw size={10} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
