import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

import { useCase } from "../../context/CaseContext";
import { useIntake } from "../../context/IntakeContext";
import { buildUfmMetadata, summarizeUfmEnvelope } from "../../lib/ufm/buildUfmMetadata";

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

export function UfmPayloadPreview() {
  const { record } = useIntake();
  const { activeProvenance } = useCase();
  const envelope = useMemo(() => buildUfmMetadata({
    record,
    provenance: activeProvenance,
  }), [activeProvenance, record]);
  const summary = summarizeUfmEnvelope(envelope);

  return (
    <div className="bg-slate-900 px-4 py-4 text-slate-100">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">UFM Metadata Preview</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {summary.populatedCount} populated · {summary.missingRequiredCount} missing required · {summary.awaitingConfirmationCount} awaiting confirmation
          </p>
        </div>
        <CopyButton text={JSON.stringify(envelope, null, 2)} />
      </div>
      <div className="mb-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
        {summary.summaryLine}
      </div>
      <pre className="max-h-96 overflow-auto rounded-lg bg-slate-800/60 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
        {JSON.stringify(envelope, null, 2)}
      </pre>
    </div>
  );
}
