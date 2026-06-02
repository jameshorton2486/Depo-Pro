// DeepgramPayloadPreview
//
// Shows the exact Deepgram API request that would be sent: full URL with
// query parameters (model, language, keywords, etc.) plus a JSON-style
// structured view. Useful for debugging and pre-flight verification.

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useKeyterms } from "./keytermStore";
import type { ManagedKeyterm } from "./types";

// ─── Deepgram base config ─────────────────────────────────────────────────────
// Matches the MVP parameters from DEEPGRAM_KEYTERM_SPEC.md

interface DeepgramParams {
  model:           string;
  language:        string;
  punctuate:       boolean;
  paragraphs:      boolean;
  utterances:      boolean;
  diarize:         boolean;
  diarize_version: string;
  smart_format:    boolean;
  numerals:        boolean;
}

const BASE_PARAMS: DeepgramParams = {
  model:           "nova-2-legal",
  language:        "en-US",
  punctuate:       true,
  paragraphs:      false,
  utterances:      true,
  diarize:         true,
  diarize_version: "latest",
  smart_format:    false,
  numerals:        false,
};

// ─── URL builder ─────────────────────────────────────────────────────────────

function buildUrl(terms: ManagedKeyterm[], speakerCount: number | null): string {
  const base = "https://api.deepgram.com/v1/listen";
  const params = new URLSearchParams();

  // Base params
  params.set("model",           BASE_PARAMS.model);
  params.set("language",        BASE_PARAMS.language);
  params.set("punctuate",       String(BASE_PARAMS.punctuate));
  params.set("paragraphs",      String(BASE_PARAMS.paragraphs));
  params.set("utterances",      String(BASE_PARAMS.utterances));
  params.set("diarize",         String(BASE_PARAMS.diarize));
  params.set("diarize_version", BASE_PARAMS.diarize_version);
  params.set("smart_format",    String(BASE_PARAMS.smart_format));
  params.set("numerals",        String(BASE_PARAMS.numerals));

  if (speakerCount !== null) {
    params.set("speakers", String(speakerCount));
  }

  // Keywords — one per selected term
  const selected = terms.filter((t) => t.selected);
  for (const term of selected) {
    params.append("keywords", `${term.term}:${term.boost.toFixed(1)}`);
  }

  return `${base}?${params.toString()}`;
}

// ─── JSON body repr ───────────────────────────────────────────────────────────

function buildStructuredPayload(terms: ManagedKeyterm[], speakerCount: number | null) {
  return {
    endpoint: "POST https://api.deepgram.com/v1/listen",
    headers: {
      "Authorization": "Token <DEEPGRAM_API_KEY>",
      "Content-Type":  "<audio/mpeg | audio/wav | video/mp4>",
    },
    query_parameters: {
      ...BASE_PARAMS,
      ...(speakerCount !== null ? { speakers: speakerCount } : {}),
      keywords: terms
        .filter((t) => t.selected)
        .map((t) => `${t.term}:${t.boost.toFixed(1)}`),
    },
    keyterm_summary: {
      total_selected: terms.filter((t) => t.selected).length,
      total_tokens: terms.filter((t) => t.selected).reduce((s, t) => s + t.token_count, 0),
      pinned: terms.filter((t) => t.pinned && t.selected).length,
    },
  };
}

// ─── Copy button ──────────────────────────────────────────────────────────────

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

// ─── Term keyword line ────────────────────────────────────────────────────────

function KeywordLine({ term }: { term: ManagedKeyterm }) {
  const encoded = `${encodeURIComponent(term.term)}:${term.boost.toFixed(1)}`;
  const boostColor =
    term.boost >= 0.8 ? "text-emerald-600" :
    term.boost >= 0.6 ? "text-amber-600" : "text-slate-500";

  return (
    <div className={`flex items-center gap-2 py-0.5 ${term.pinned ? "bg-amber-50/50" : ""}`}>
      <span className="font-mono text-xs text-slate-700">
        <span className="text-slate-400">keywords=</span>
        <span className="font-semibold">{term.term}</span>
        <span className="text-slate-400">:</span>
        <span className={`font-bold ${boostColor}`}>{term.boost.toFixed(1)}</span>
      </span>
      {term.pinned && (
        <span className="rounded-sm bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">PIN</span>
      )}
      <span className="ml-auto font-mono text-[10px] text-slate-400">{encoded}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  speakerCount?: number | null;
}

export function DeepgramPayloadPreview({ speakerCount = null }: Props) {
  const { state } = useKeyterms();
  const selected = state.terms.filter((t) => t.selected);
  const url = buildUrl(state.terms, speakerCount);
  const structured = buildStructuredPayload(state.terms, speakerCount);

  const [tab, setTab] = useState<"url" | "structured">("url");

  const tabClass = (t: "url" | "structured") =>
    `px-3 py-1.5 text-xs font-semibold rounded-md transition-colors focus:outline-none ${
      tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
    }`;

  return (
    <div className="bg-slate-900 px-4 py-4 text-slate-100">

      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Deepgram Request Preview
          </span>
        </div>

        {/* Tab switcher */}
        <div className="ml-auto flex gap-0.5 rounded-lg bg-slate-800 p-0.5">
          <button type="button" onClick={() => setTab("url")}       className={tabClass("url")}>URL</button>
          <button type="button" onClick={() => setTab("structured")} className={tabClass("structured")}>Structured</button>
        </div>
      </div>

      {tab === "url" ? (
        <div>
          {/* Endpoint + base params */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-900/60 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400">POST</span>
              <span className="font-mono text-xs text-slate-300">https://api.deepgram.com/v1/listen</span>
            </div>
            <div className="flex items-center gap-1">
              <CopyButton text={url} />
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

          {/* Base parameters */}
          <div className="mb-4 rounded-lg bg-slate-800/60 px-3 py-2">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Base Parameters</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
              {Object.entries(BASE_PARAMS).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 py-0.5">
                  <span className="font-mono text-[11px] text-slate-400">{k}=</span>
                  <span className={`font-mono text-[11px] font-semibold ${
                    v === true ? "text-emerald-400" : v === false ? "text-rose-400" : "text-amber-300"
                  }`}>{String(v)}</span>
                </div>
              ))}
              {speakerCount !== null && (
                <div className="flex items-center gap-1.5 py-0.5">
                  <span className="font-mono text-[11px] text-slate-400">speakers=</span>
                  <span className="font-mono text-[11px] font-semibold text-amber-300">{speakerCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Keywords */}
          <div className="rounded-lg bg-slate-800/60 px-3 py-2">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Keywords ({selected.length})
              </p>
              <CopyButton text={selected.map((t) => `keywords=${t.term}:${t.boost.toFixed(1)}`).join("&")} />
            </div>
            {selected.length === 0 ? (
              <p className="py-2 text-center text-xs italic text-slate-600">
                No terms selected — add and enable keyterms above
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {selected.map((t) => <KeywordLine key={t.id} term={t} />)}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Structured Payload
            </p>
            <CopyButton text={JSON.stringify(structured, null, 2)} />
          </div>
          <pre className="max-h-80 overflow-auto rounded-lg bg-slate-800/60 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
            {JSON.stringify(structured, null, 2)}
          </pre>
        </div>
      )}

      {/* Stats bar */}
      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-700/50 pt-3 text-[11px] text-slate-500">
        <span>
          <span className="font-bold text-slate-300">{selected.length}</span> terms
        </span>
        <span>
          <span className="font-bold text-slate-300">
            {selected.reduce((s, t) => s + t.token_count, 0)}
          </span> tokens
        </span>
        <span>
          <span className="font-bold text-amber-400">
            {selected.filter((t) => t.pinned).length}
          </span> pinned
        </span>
        <span className="ml-auto">
          Avg boost:{" "}
          <span className="font-bold text-slate-300">
            {selected.length > 0
              ? (selected.reduce((s, t) => s + t.boost, 0) / selected.length).toFixed(2)
              : "—"}
          </span>
        </span>
      </div>
    </div>
  );
}
