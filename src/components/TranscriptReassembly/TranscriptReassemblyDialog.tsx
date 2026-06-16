import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { workspaceApi } from "../../api/workspaceService";
import { useDocument } from "../../context/DocumentContext";
import type { TranscriptReassemblyPreview } from "../../lib/transcript/reassembly";

export function TranscriptReassemblyDialog() {
  const { state, saveNow, loadDocument } = useDocument();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<TranscriptReassemblyPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcriptId = state.currentTranscriptId;

  async function handlePreview() {
    if (!transcriptId) {
      return;
    }

    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      if (state.dirty) {
        await saveNow();
      }
      const nextPreview = await workspaceApi.getTranscriptReassemblyPreview(transcriptId, {
        lastKnownUpdatedAt: state.jobUpdatedAt,
      });
      setPreview(nextPreview);
    } catch (nextError) {
      setError(String(nextError));
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!transcriptId || !preview) {
      return;
    }

    setApplying(true);
    setError(null);
    try {
      await workspaceApi.applyTranscriptReassembly(transcriptId, preview.previewToken, {
        lastKnownUpdatedAt: state.jobUpdatedAt,
      });
      await loadDocument();
      setOpen(false);
      setPreview(null);
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handlePreview()}
        disabled={!transcriptId || state.loading || state.saving}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-default"
      >
        <RefreshCw size={13} />
        Refine
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Transcript Refinement</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Preview corrections and refinements</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {loading && (
              <div className="mt-6 text-sm text-slate-600">Building transcript refinement preview…</div>
            )}

            {error && (
              <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            {preview && (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Current Assembly Version</div>
                    <div className="mt-2 font-mono text-sm text-slate-900">{preview.currentAssemblyVersion}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Latest Assembly Version</div>
                    <div className="mt-2 font-mono text-sm text-slate-900">{preview.latestAssemblyVersion}</div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricCard
                    label="Mixed Utterances"
                    beforeValue={preview.currentMetrics.mixedCanonicalUtterances}
                    afterValue={preview.candidateMetrics.mixedCanonicalUtterances}
                  />
                  <MetricCard
                    label="Utterance Count"
                    beforeValue={preview.currentMetrics.utteranceCount}
                    afterValue={preview.candidateMetrics.utteranceCount}
                  />
                  <MetricCard
                    label="Speaker Count"
                    beforeValue={preview.currentMetrics.speakerCount}
                    afterValue={preview.candidateMetrics.speakerCount}
                  />
                  <MetricCard
                    label="Word Count"
                    beforeValue={preview.currentMetrics.wordCount}
                    afterValue={preview.candidateMetrics.wordCount}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <ImpactCard label="Review State Impact" value={preview.impacts.reviewStateImpact} />
                  <ImpactCard label="Suggestions Impact" value={preview.impacts.suggestionsImpact} />
                  <ImpactCard label="Audit Impact" value={preview.impacts.auditImpact} />
                </div>

                {preview.blockedReasons.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <div className="font-semibold">Apply blocked</div>
                    <ul className="mt-2 list-disc pl-5">
                      {preview.blockedReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setError(null);
                    }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleApply()}
                    disabled={!preview.canApply || applying}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-default"
                  >
                    {applying ? "Applying..." : "Apply Refinements"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MetricCard({
  label,
  beforeValue,
  afterValue,
}: {
  label: string;
  beforeValue: number;
  afterValue: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-3 flex items-center gap-3 text-sm text-slate-800">
        <span className="font-mono">{beforeValue}</span>
        <span className="text-slate-400">→</span>
        <span className="font-mono">{afterValue}</span>
      </div>
    </div>
  );
}

function ImpactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-3 text-sm font-mono text-slate-800">{value}</div>
    </div>
  );
}
