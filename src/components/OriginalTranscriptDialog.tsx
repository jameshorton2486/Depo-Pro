import { useEffect, useState } from "react";
import { X, FileText, FileType, FileJson } from "lucide-react";
import type { EditorDocument } from "../api/types";
import { workspaceApi } from "../api/workspaceService";
import { useIntake } from "../context/useIntake";
import {
  buildFormattedTranscriptText,
  buildWordTranscriptHtml,
  buildWorkspaceTranscriptJson,
  downloadBlob,
} from "../lib/transcriptDownloads";

interface Props {
  caseId: string;
  onClose: () => void;
}

type LoadStatus = "loading" | "ready" | "missing" | "error";

// Read-only viewer for the immutable Original transcript (the structured transcript
// as first produced by the pipeline). It never mutates anything — it fetches the
// captured snapshot and renders it, with its own TXT/Word/JSON exports so the user
// can compare the original against their working copy.
export function OriginalTranscriptDialog({ caseId, onClose }: Props) {
  const { record } = useIntake();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [document, setDocument] = useState<EditorDocument | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    workspaceApi
      .getOriginalDocument(caseId)
      .then((doc) => {
        if (cancelled) {
          return;
        }
        if (!doc) {
          setStatus("missing");
          return;
        }
        setDocument(doc);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const transcriptText = document ? buildFormattedTranscriptText(document, { record }) : "";
  const ready = status === "ready" && document != null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Original transcript"
      data-testid="original-transcript-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Read-only</p>
            <h2 className="text-lg font-semibold text-slate-900">Original transcript</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                downloadBlob(`${caseId}-original-transcript.txt`, "text/plain;charset=utf-8", transcriptText)
              }
              disabled={!ready}
              className="flex items-center gap-1.5 rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-default disabled:opacity-40"
              title="Download the original transcript as text"
            >
              <FileText size={14} />
              TXT
            </button>
            <button
              type="button"
              onClick={() =>
                downloadBlob(
                  `${caseId}-original-transcript.doc`,
                  "application/msword;charset=utf-8",
                  buildWordTranscriptHtml(`${caseId} Original Transcript`, transcriptText),
                )
              }
              disabled={!ready}
              className="flex items-center gap-1.5 rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-default disabled:opacity-40"
              title="Download the original transcript as a Word-compatible document"
            >
              <FileType size={14} />
              Word
            </button>
            <button
              type="button"
              onClick={() =>
                downloadBlob(
                  `${caseId}-original-transcript.json`,
                  "application/json;charset=utf-8",
                  document ? buildWorkspaceTranscriptJson(document) : "",
                )
              }
              disabled={!ready}
              className="flex items-center gap-1.5 rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-default disabled:opacity-40"
              title="Download the original transcript JSON"
            >
              <FileJson size={14} />
              JSON
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close original transcript"
              className="ml-1 rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          {status === "loading" && (
            <p className="text-sm text-slate-500">Loading the original transcript…</p>
          )}
          {status === "missing" && (
            <p className="text-sm text-slate-500">
              No original snapshot exists for this transcript. Originals are captured automatically for
              transcripts created going forward.
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-red-600">The original transcript could not be loaded.</p>
          )}
          {ready && (
            <pre
              data-testid="original-transcript-text"
              className="whitespace-pre-wrap font-mono text-sm leading-6 text-slate-800"
            >
              {transcriptText}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
