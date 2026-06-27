import { useState } from "react";
import type React from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Mic,
  RefreshCw,
  Users,
} from "lucide-react";
import { useDocument } from "../../context/DocumentContext";
import type {
  CorrectionReport,
  RetranscriptionCandidate,
  TranscriptDefect,
} from "../../lib/transcript/correctionOrchestrator";

export function buildRetranscriptionClipboardText(
  candidates: RetranscriptionCandidate[],
): string {
  return candidates.map((candidate) => candidate.keyterm).join("\n");
}

export async function copyRetranscriptionKeyterms(
  candidates: RetranscriptionCandidate[],
): Promise<void> {
  await navigator.clipboard.writeText(
    buildRetranscriptionClipboardText(candidates),
  );
}

function scrollToWord(wordId: string): void {
  const el = document.querySelector<HTMLElement>(`[data-word-id="${wordId}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("word-conf-focus");
  window.setTimeout(() => el.classList.remove("word-conf-focus"), 1200);
}

export function CorrectionsPanel() {
  const { state } = useDocument();
  const report = state.correctionReport;

  if (!report) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <Mic size={24} className="text-slate-300" />
        <p className="text-xs text-slate-400">
          Load a transcript to see the correction report.
        </p>
      </div>
    );
  }

  const { summary } = report;
  const isClean =
    summary.ambiguous_flags === 0 &&
    summary.low_confidence_words === 0 &&
    summary.speaker_issues === 0 &&
    summary.implausible_money_flags === 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-3">
        <ClipboardCheck size={13} className="text-blue-600" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Corrections
        </h2>
        {!isClean && (
          <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
            {summary.ambiguous_flags +
              summary.speaker_issues +
              summary.implausible_money_flags}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3 p-3">
        <SummaryCard report={report} isClean={isClean} />

        {report.retranscription_candidates.length > 0 && (
          <RetranscriptionSection candidates={report.retranscription_candidates} />
        )}

        {report.ambiguous_flags.length > 0 && (
          <DefectSection
            title="Needs Audio Verification"
            icon={<AlertTriangle size={12} className="text-amber-600" />}
            defects={report.ambiguous_flags}
            badgeColor="bg-amber-100 text-amber-700"
            borderColor="border-amber-200 bg-amber-50"
          />
        )}

        {report.implausible_money.length > 0 && (
          <DefectSection
            title="Verify Money Amounts"
            icon={<AlertTriangle size={12} className="text-red-500" />}
            defects={report.implausible_money}
            badgeColor="bg-red-100 text-red-700"
            borderColor="border-red-200 bg-red-50"
          />
        )}

        {report.speaker_issues.length > 0 && (
          <SpeakerIssueSection issues={report.speaker_issues} />
        )}

        {report.deterministic_corrections.length > 0 && (
          <DeterministicSection corrections={report.deterministic_corrections} />
        )}

        {report.low_confidence.length > 0 && (
          <LowConfidenceSection defects={report.low_confidence} />
        )}

        {isClean && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle size={28} className="text-emerald-400" />
            <p className="text-xs font-semibold text-slate-600">
              No issues found
            </p>
            <p className="text-[11px] text-slate-400">
              All corrections applied. Ready for review.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  report,
  isClean,
}: {
  report: CorrectionReport;
  isClean: boolean;
}) {
  const { summary } = report;

  return (
    <div
      className={`space-y-2 rounded-lg border p-3 ${
        isClean ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Report Summary
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <StatRow label="Words" value={summary.total_words} color="text-slate-600" />
        <StatRow
          label="Auto-fixed"
          value={summary.deterministic_corrections_applied}
          color="text-emerald-600"
        />
        <StatRow
          label="Verify"
          value={summary.ambiguous_flags + summary.implausible_money_flags}
          color={
            summary.ambiguous_flags + summary.implausible_money_flags > 0
              ? "font-semibold text-amber-600"
              : "text-slate-400"
          }
        />
        <StatRow
          label="Low conf."
          value={summary.low_confidence_words}
          color={
            summary.low_confidence_words > 0 ? "text-slate-600" : "text-slate-400"
          }
        />
        <StatRow
          label="Speakers"
          value={summary.speaker_issues > 0 ? `${summary.speaker_issues} WARN` : "OK"}
          color={
            summary.speaker_issues > 0
              ? "font-semibold text-amber-600"
              : "text-emerald-600"
          }
        />
        <StatRow
          label="Retranscribe"
          value={
            summary.retranscription_candidates > 0
              ? `${summary.retranscription_candidates} terms`
              : "Not needed"
          }
          color={
            summary.retranscription_candidates > 0
              ? "text-blue-600"
              : "text-slate-400"
          }
        />
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-slate-400">{label}</span>
      <span className={`text-[10px] ${color}`}>{value}</span>
    </div>
  );
}

function RetranscriptionSection({
  candidates,
}: {
  candidates: RetranscriptionCandidate[];
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyRetranscriptionKeyterms(candidates);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-blue-200 bg-blue-50">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <RefreshCw size={12} className="shrink-0 text-blue-600" />
        <span className="flex-1 text-[11px] font-semibold text-blue-800">
          Retranscription recommended
        </span>
        <span className="text-[10px] text-blue-600">{candidates.length} keyterms</span>
        {open ? (
          <ChevronDown size={12} className="text-blue-500" />
        ) : (
          <ChevronRight size={12} className="text-blue-500" />
        )}
      </button>

      {open && (
        <div className="space-y-2 border-t border-blue-200 px-3 pb-3">
          <p className="pt-2 text-[11px] text-blue-700">
            Add these keyterms before retranscribing to fix garbled names and
            terms at the source:
          </p>
          <div className="space-y-1">
            {candidates.map((candidate) => (
              <div key={candidate.keyterm} className="flex items-start gap-2">
                <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] text-blue-800">
                  {candidate.keyterm}
                </span>
                <span className="text-[10px] leading-tight text-blue-600">
                  {candidate.reason}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={handleCopy}
            className="w-full rounded border border-blue-300 px-2 py-1.5 text-[10px] text-blue-700 transition-colors hover:bg-blue-100"
          >
            {copied ? "Copied" : "Copy keyterms"}
          </button>
        </div>
      )}
    </div>
  );
}

function DefectSection({
  title,
  icon,
  defects,
  badgeColor,
  borderColor,
}: {
  title: string;
  icon: React.ReactNode;
  defects: TranscriptDefect[];
  badgeColor: string;
  borderColor: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className={`overflow-hidden rounded-lg border ${borderColor}`}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        {icon}
        <span className="flex-1 text-[11px] font-semibold text-slate-700">
          {title}
        </span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${badgeColor}`}
        >
          {defects.length}
        </span>
        {open ? (
          <ChevronDown size={12} className="text-slate-400" />
        ) : (
          <ChevronRight size={12} className="text-slate-400" />
        )}
      </button>

      {open && (
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {defects.map((defect) => (
            <div key={defect.word_id} className="space-y-0.5 px-3 py-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollToWord(defect.word_id)}
                  className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-600"
                  title="Jump to word in transcript"
                >
                  {defect.raw_token}
                </button>
                {defect.likely_meaning && (
                  <span className="text-[10px] text-slate-400">
                    - likely{" "}
                    <span className="font-medium text-slate-600">
                      {defect.likely_meaning}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-[10px] leading-tight text-slate-400">
                {defect.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SpeakerIssueSection({
  issues,
}: {
  issues: CorrectionReport["speaker_issues"];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <Users size={12} className="shrink-0 text-amber-600" />
        <span className="flex-1 text-[11px] font-semibold text-slate-700">
          Speaker Issues
        </span>
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
          {issues.length}
        </span>
        {open ? (
          <ChevronDown size={12} className="text-slate-400" />
        ) : (
          <ChevronRight size={12} className="text-slate-400" />
        )}
      </button>

      {open && (
        <div className="divide-y divide-amber-100 border-t border-amber-100">
          {issues.map((issue) => (
            <div key={issue.speaker_id} className="space-y-0.5 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-slate-700">
                  {issue.current_display_name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {issue.utterance_count} utterances
                </span>
              </div>
              <p className="text-[10px] leading-tight text-slate-500">
                {issue.description}
              </p>
              <p className="text-[10px] text-amber-600">Fix in Speakers tab -&gt;</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeterministicSection({
  corrections,
}: {
  corrections: TranscriptDefect[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <CheckCircle size={12} className="shrink-0 text-emerald-500" />
        <span className="flex-1 text-[11px] font-semibold text-slate-700">
          Auto-corrected
        </span>
        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
          {corrections.length}
        </span>
        {open ? (
          <ChevronDown size={12} className="text-slate-400" />
        ) : (
          <ChevronRight size={12} className="text-slate-400" />
        )}
      </button>

      {open && (
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {corrections.map((correction, index) => (
            <div
              key={`${correction.word_id}-${index}`}
              className="space-y-0.5 px-3 py-2"
            >
              <div className="flex items-center gap-2 text-[10px]">
                <span className="font-mono text-slate-400 line-through">
                  {correction.raw_token}
                </span>
                <span className="text-slate-300">-&gt;</span>
                <span className="font-mono font-medium text-slate-700">
                  {correction.corrected_token}
                </span>
              </div>
              <p className="text-[10px] leading-tight text-slate-400">
                {correction.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LowConfidenceSection({
  defects,
}: {
  defects: TranscriptDefect[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <AlertTriangle size={12} className="shrink-0 text-slate-400" />
        <span className="flex-1 text-[11px] font-semibold text-slate-500">
          Low confidence
        </span>
        <span className="px-1.5 py-0.5 text-[10px] text-slate-400">
          {defects.length}
        </span>
        {open ? (
          <ChevronDown size={12} className="text-slate-400" />
        ) : (
          <ChevronRight size={12} className="text-slate-400" />
        )}
      </button>

      {open && (
        <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100">
          {defects.map((defect) => (
            <div key={defect.word_id} className="flex items-center gap-2 px-3 py-1.5">
              <span className="font-mono text-[10px] text-slate-500">
                {defect.raw_token}
              </span>
              <span className="ml-auto text-[10px] text-slate-400">
                {defect.confidence !== undefined
                  ? `${(defect.confidence * 100).toFixed(0)}%`
                  : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
