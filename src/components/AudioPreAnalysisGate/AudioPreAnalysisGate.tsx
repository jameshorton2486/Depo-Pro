import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import type { AudioPreAnalysisReport } from "../../lib/audio/audioPreAnalysis";

export interface AudioPreAnalysisGateProps {
  report: AudioPreAnalysisReport;
  countdownSeconds?: number | null;
  confirmChecked?: boolean;
  onConfirmCheckedChange?: (checked: boolean) => void;
  onProceed: () => void;
  onCancel: () => void;
}

function formatFileSize(fileSizeBytes: number | null): string {
  if (fileSizeBytes == null) {
    return "Unknown size";
  }
  if (fileSizeBytes >= 1024 * 1024 * 1024) {
    return `${(fileSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (fileSizeBytes >= 1024 * 1024) {
    return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (fileSizeBytes >= 1024) {
    return `${(fileSizeBytes / 1024).toFixed(1)} KB`;
  }
  return `${fileSizeBytes} B`;
}

function qualityBadgeClass(quality: AudioPreAnalysisReport["estimated_quality"]): string {
  switch (quality) {
    case "high":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "good":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "acceptable":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "low":
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

function riskRowClass(severity: "info" | "warning" | "critical"): string {
  switch (severity) {
    case "critical":
      return "border-rose-200 bg-rose-50";
    case "warning":
      return "border-amber-200 bg-amber-50";
    case "info":
      return "border-slate-200 bg-slate-50";
  }
}

export function AudioPreAnalysisGate({
  report,
  countdownSeconds = null,
  confirmChecked = false,
  onConfirmCheckedChange,
  onProceed,
  onCancel,
}: AudioPreAnalysisGateProps) {
  const isProceed = report.gate_action === "proceed";
  const isConfirmRequired = report.gate_action === "confirm_required";
  const isBlock = report.gate_action === "block";

  return (
    <div
      className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
      data-testid="audio-pre-analysis-gate"
    >
      <div className="flex items-start gap-3">
        <div className={
          isBlock
            ? "rounded-full bg-rose-100 p-2 text-rose-700"
            : isProceed
              ? "rounded-full bg-emerald-100 p-2 text-emerald-700"
              : "rounded-full bg-amber-100 p-2 text-amber-700"
        }
        >
          {isBlock ? <XCircle size={18} /> : isProceed ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">Audio Pre-Analysis</p>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${qualityBadgeClass(report.estimated_quality)}`}>
              {report.estimated_quality}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{report.gate_message}</p>
          <p className="mt-2 text-xs text-slate-500">
            {report.duration_minutes_display} · {formatFileSize(report.file_size_bytes)}
            {report.estimated_bitrate_kbps != null ? ` · ${report.estimated_bitrate_kbps.toFixed(1)} kbps` : ""}
            {isProceed && countdownSeconds != null ? ` · Starting in ${countdownSeconds}s...` : ""}
          </p>
        </div>
      </div>

      {report.risks.length > 0 && (
        <div className="mt-3 space-y-2">
          {report.risks.map((risk) => (
            <div
              key={risk.code}
              className={`rounded-xl border px-3 py-2 ${riskRowClass(risk.severity)}`}
              data-testid={`audio-pre-analysis-risk-${risk.code}`}
            >
              <p className="text-sm font-semibold text-slate-900">{risk.title}</p>
              <p className="mt-1 text-xs text-slate-600">{risk.recommendation}</p>
            </div>
          ))}
        </div>
      )}

      {isConfirmRequired && (
        <label className="mt-3 flex items-start gap-2 text-xs text-slate-600" data-testid="audio-pre-analysis-confirm-label">
          <input
            type="checkbox"
            checked={confirmChecked}
            onChange={(event) => onConfirmCheckedChange?.(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
          />
          <span>I reviewed the warnings and want to proceed with transcription.</span>
        </label>
      )}

      <div className="mt-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
          data-testid="audio-pre-analysis-cancel"
        >
          Cancel
        </button>
        {!isBlock && (
          <button
            type="button"
            onClick={onProceed}
            disabled={isConfirmRequired && !confirmChecked}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            data-testid="audio-pre-analysis-proceed"
          >
            {isProceed ? "Start Now" : "Proceed Anyway"}
          </button>
        )}
      </div>
    </div>
  );
}
