import { useMemo, useState } from "react";
import { Copy, Check, ExternalLink, FileText } from "lucide-react";

import { useIntake } from "../../context/useIntake";
import { buildDeepgramRequestFromStoredKeyterms } from "../../lib/deepgram/buildDeepgramRequest";
import { openJsonPreviewInNotepad } from "../../api/intakeDesktopService";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 focus:outline-none"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </button>
  );
}

function KeytermLine({
  term,
  boost,
  category,
  source,
}: {
  term: string;
  boost: number;
  category: string;
  source: string;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="font-mono text-xs text-slate-700">
        <span className="font-semibold">{term}</span>
      </span>
      <span className="rounded-sm bg-slate-200 px-1 text-[10px] font-semibold text-slate-600">
        {category}
      </span>
      <span className="rounded-sm bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">
        {source}
      </span>
      <span className="ml-auto font-mono text-[10px] text-slate-400">boost {boost}</span>
    </div>
  );
}

export function DeepgramPayloadPreview() {
  const { record } = useIntake();
  const [tab, setTab] = useState<"url" | "structured">("url");
  const [openMode, setOpenMode] = useState<null | "notepad" | "download">(null);
  const offlineFixture =
    import.meta.env.VITE_TRANSCRIPTION_PROVIDER === "offline"
    || !import.meta.env.VITE_DEEPGRAM_API_KEY;

  const request = useMemo(() => buildDeepgramRequestFromStoredKeyterms({
    caseId: record.case_id,
    keyterms: record.deepgram.keyterms,
    config: record.deepgram,
  }), [record.case_id, record.deepgram]);

  const selectedTerms = request.envelope.keyterms;
  const structuredPayload = JSON.stringify(request.envelope, null, 2);
  const previewFilename = `${record.case_id || "case"}_deepgram_request.json`;

  const tabClass = (value: "url" | "structured") =>
    `px-3 py-1.5 text-xs font-semibold rounded-md transition-colors focus:outline-none ${
      tab === value ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
    }`;

  async function handleOpenInNotepad() {
    const mode = await openJsonPreviewInNotepad(previewFilename, structuredPayload);
    setOpenMode(mode);
    window.setTimeout(() => setOpenMode(null), 2500);
  }

  return (
    <div className="bg-slate-900 px-4 py-4 text-slate-100">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Deepgram Request Preview
          </span>
          {offlineFixture && (
            <span className="rounded-full border border-amber-400/60 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              Offline Fixture
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void handleOpenInNotepad();
            }}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none"
          >
            <FileText className="h-3.5 w-3.5" />
            {openMode === "download" ? "Downloaded" : openMode === "notepad" ? "Opened" : "Notepad"}
          </button>
          <div className="flex gap-0.5 rounded-lg bg-slate-800 p-0.5">
          <button type="button" onClick={() => setTab("url")} className={tabClass("url")}>URL</button>
          <button type="button" onClick={() => setTab("structured")} className={tabClass("structured")}>Structured</button>
          </div>
        </div>
      </div>

      {tab === "url" ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-900/60 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400">POST</span>
              <span className="font-mono text-xs text-slate-300">https://api.deepgram.com/v1/listen</span>
            </div>
            <div className="flex items-center gap-1">
              <CopyButton text={request.wireUrl} />
              <a
                href="https://developers.deepgram.com/reference/listen-file"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Docs
              </a>
            </div>
          </div>

          <div className="mb-4 rounded-lg bg-slate-800/60 px-3 py-2">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Request Parameters</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
              {Object.entries(request.envelope.deepgram_request).map(([key, value]) => (
                <div key={key} className="flex items-center gap-1.5 py-0.5">
                  <span className="font-mono text-[11px] text-slate-400">{key}=</span>
                  <span className={`font-mono text-[11px] font-semibold ${value === "true" ? "text-emerald-400" : "text-amber-300"}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-slate-800/60 px-3 py-2">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Keyterms ({request.envelope.keyterms_count})
              </p>
              <CopyButton text={request.wireQueryString} />
            </div>
            {selectedTerms.length === 0 ? (
              <p className="py-2 text-center text-xs italic text-slate-600">
                No terms selected - add and enable keyterms above
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {selectedTerms.map((keyterm) => (
                  <KeytermLine key={`${keyterm.term}:${keyterm.source}`} {...keyterm} />
                ))}
              </div>
            )}
            {request.envelope.keyterms_note && (
              <p className="mt-2 text-[11px] text-amber-300">{request.envelope.keyterms_note}</p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Structured Payload
            </p>
            <CopyButton text={structuredPayload} />
          </div>
          <pre className="max-h-80 overflow-auto rounded-lg bg-slate-800/60 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
            {structuredPayload}
          </pre>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-700/50 pt-3 text-[11px] text-slate-500">
        <span>
          <span className="font-bold text-slate-300">{request.envelope.keyterms_count}</span> selected keyterms
        </span>
        <span>
          <span className="font-bold text-slate-300">{request.envelope.estimated_token_usage}</span> estimated tokens / {request.envelope.estimated_token_cap}
        </span>
        <span>
          <span className="font-bold text-slate-300">{request.wireKeyterms.length}</span> sent on wire
        </span>
      </div>
    </div>
  );
}
