import { useMemo, useState } from "react";
import { ChevronLeft, Clipboard, Download, FileArchive, FileText } from "lucide-react";
import { useDocument } from "../../context/DocumentContext";
import { useIntake } from "../../context/useIntake";
import { useStage } from "../../context/StageContext";
import { abbreviationRegistry } from "../../lib/format/abbreviationRegistry";
import { cfe } from "../../lib/format/cfe";
import { DEFAULT_GEOMETRY_PROFILE } from "../../lib/format/geometryProfile";
import { serializeFormattedDocument } from "../../lib/format/serialize";
import { WorkflowStageNav } from "../WorkflowStageNav";

interface GeneratedArtifact {
  name: string;
  type: string;
  size: number;
}

function certificationKey(jobId: string) {
  return `depo-pro.certification.${jobId}.v1`;
}

function downloadBlob(filename: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return { name: filename, type, size: blob.size };
}

export function ExportScreen({ jobId }: { jobId: string }) {
  const { state: docState } = useDocument();
  const { record } = useIntake();
  const { setStage } = useStage();
  const [lastArtifact, setLastArtifact] = useState<GeneratedArtifact | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const certificationReady = useMemo(() => {
    try {
      const raw = localStorage.getItem(certificationKey(jobId));
      if (!raw) return false;
      const parsed = JSON.parse(raw) as {
        certificationStatement?: string;
        checklist?: Record<string, boolean>;
      };
      return !!parsed.certificationStatement?.trim() &&
        Object.values(parsed.checklist ?? {}).every(Boolean);
    } catch {
      return false;
    }
  }, [jobId]);

  async function handleCopyTranscript() {
    if (!transcriptText) return;
    try {
      await navigator.clipboard.writeText(transcriptText);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 3000);
    }
  }

  const transcriptText = useMemo(() => {
    if (!docState.document) return "";
    return serializeFormattedDocument(
      cfe(docState.document, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry)
    );
  }, [docState.document]);

  const packageJson = useMemo(
    () =>
      JSON.stringify(
        {
          job_id: docState.document?.job_id ?? jobId,
          case_name: record.caption.case_name.value,
          case_number: record.caption.case_number.value,
          generated_at: new Date().toISOString(),
          transcript_text: transcriptText,
          word_count: docState.document?.words.length ?? 0,
        },
        null,
        2
      ),
    [docState.document, jobId, record.caption.case_name.value, record.caption.case_number.value, transcriptText]
  );

  return (
    <div className="flex h-full flex-col bg-slate-100 text-slate-900">
      <WorkflowStageNav jobId={jobId} />

      <header className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <FileArchive size={18} className="text-blue-700" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Stage 7</p>
            <h1 className="text-lg font-semibold text-slate-900">Export</h1>
          </div>
          <span className="ml-auto text-xs text-slate-500">{record.caption.case_name.value || jobId}</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto max-w-4xl space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Export Status</h2>
            <p className="text-sm text-slate-600">
              {certificationReady
                ? "Certification is complete. Export actions are enabled."
                : "Certification must be completed before export actions can be used."}
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <FileText size={16} className="text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">TXT Transcript</h2>
              </div>
              <p className="mb-4 text-sm text-slate-600">
                Export the current transcript as plain text.
              </p>
              <button
                type="button"
                disabled={!certificationReady || !docState.document}
                onClick={() =>
                  setLastArtifact(
                    downloadBlob(
                      `${jobId}-transcript.txt`,
                      "text/plain;charset=utf-8",
                      transcriptText
                    )
                  )
                }
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={13} />
                Export TXT
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <FileArchive size={16} className="text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">Transcript Package</h2>
              </div>
              <p className="mb-4 text-sm text-slate-600">
                Export a local JSON package containing transcript metadata and text.
              </p>
              <button
                type="button"
                disabled={!certificationReady || !docState.document}
                onClick={() =>
                  setLastArtifact(
                    downloadBlob(
                      `${jobId}-package.json`,
                      "application/json;charset=utf-8",
                      packageJson
                    )
                  )
                }
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={13} />
                Export Package
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Clipboard size={16} className="text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">Copy Transcript</h2>
              </div>
              <p className="mb-4 text-sm text-slate-600">
                Copy the formatted transcript text to the clipboard for pasting into another tool.
              </p>
              <button
                type="button"
                disabled={!docState.document || copyState === "copied"}
                onClick={() => void handleCopyTranscript()}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Clipboard size={13} />
                {copyState === "copied" ? "Copied!" : "Copy Transcript"}
              </button>
              {copyState === "error" && (
                <p className="mt-2 text-xs text-red-600">Copy failed — try Export TXT instead.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Other Formats</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>DOCX: not implemented in this local remediation pass</li>
              <li>PDF: not implemented in this local remediation pass</li>
            </ul>
          </section>

          {lastArtifact && (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <h2 className="mb-1 text-sm font-semibold text-emerald-800">Last Generated Output</h2>
              <p className="text-sm text-emerald-700">
                {lastArtifact.name} ({lastArtifact.type}, {lastArtifact.size} bytes)
              </p>
            </section>
          )}
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button
            type="button"
            onClick={() => setStage("certification")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft size={13} />
            Back to Certification
          </button>
        </div>
      </footer>
    </div>
  );
}
