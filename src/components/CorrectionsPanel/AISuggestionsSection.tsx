import { useMemo, useState } from "react";

import {
  useAISuggestions,
  useAcceptAISuggestion,
  useAcceptAllAISuggestions,
  useRejectAISuggestion,
} from "../../hooks/useAISuggestions";

interface Props {
  transcriptId: string;
  onScrollToWord?: (wordId: string) => void;
}

export function AISuggestionsSection({ transcriptId, onScrollToWord }: Props) {
  const { data: suggestions, isLoading, refresh } = useAISuggestions(transcriptId);
  const accept = useAcceptAISuggestion(transcriptId, refresh);
  const reject = useRejectAISuggestion(transcriptId, refresh);
  const acceptAll = useAcceptAllAISuggestions(transcriptId, refresh);
  const [expanded, setExpanded] = useState(true);

  const highConfidence = useMemo(
    () => suggestions.filter((suggestion) => suggestion.ai_confidence >= 0.9),
    [suggestions],
  );
  const lowerConfidence = useMemo(
    () => suggestions.filter((suggestion) => suggestion.ai_confidence < 0.9),
    [suggestions],
  );

  if (isLoading || suggestions.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-lg border border-blue-200 bg-blue-50">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="shrink-0 text-[12px] text-blue-600">✦</span>
        <span className="flex-1 text-[11px] font-semibold text-slate-700">
          AI Suggestions
        </span>
        <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
          {suggestions.length}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-blue-100 bg-white">
          {suggestions.length > 1 && (
            <div className="border-b border-slate-100 px-3 py-2">
              <button
                type="button"
                className="rounded bg-blue-600 px-3 py-1 text-[12px] font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                onClick={() => void acceptAll.mutate()}
                disabled={acceptAll.isPending}
              >
                Accept all {suggestions.length} suggestions
              </button>
            </div>
          )}

          {highConfidence.length > 0 && (
            <SuggestionGroup
              label="High confidence"
              labelClassName="text-emerald-600"
              suggestions={highConfidence}
              onAccept={(wordId) => void accept.mutate(wordId)}
              onReject={(wordId) => void reject.mutate(wordId)}
              onScrollToWord={onScrollToWord}
              disabled={accept.isPending || reject.isPending}
            />
          )}

          {lowerConfidence.length > 0 && (
            <SuggestionGroup
              label="Verify carefully"
              labelClassName="text-amber-600"
              suggestions={lowerConfidence}
              onAccept={(wordId) => void accept.mutate(wordId)}
              onReject={(wordId) => void reject.mutate(wordId)}
              onScrollToWord={onScrollToWord}
              disabled={accept.isPending || reject.isPending}
            />
          )}
        </div>
      )}
    </section>
  );
}

function SuggestionGroup({
  label,
  labelClassName,
  suggestions,
  onAccept,
  onReject,
  onScrollToWord,
  disabled,
}: {
  label: string;
  labelClassName: string;
  suggestions: Array<{
    word_id: string;
    raw_text: string;
    ai_suggestion: string;
    ai_suggestion_reason: string;
    ai_confidence: number;
    utterance_raw_text: string;
  }>;
  onAccept: (wordId: string) => void;
  onReject: (wordId: string) => void;
  onScrollToWord?: (wordId: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="px-3 py-2">
      <span className={`mb-2 block text-[11px] font-semibold uppercase tracking-wide ${labelClassName}`}>
        {label}
      </span>
      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <AISuggestionRow
            key={suggestion.word_id}
            suggestion={suggestion}
            onAccept={() => onAccept(suggestion.word_id)}
            onReject={() => onReject(suggestion.word_id)}
            onClickContext={() => onScrollToWord?.(suggestion.word_id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

function AISuggestionRow({
  suggestion,
  onAccept,
  onReject,
  onClickContext,
  disabled,
}: {
  suggestion: {
    word_id: string;
    raw_text: string;
    ai_suggestion: string;
    ai_suggestion_reason: string;
    ai_confidence: number;
    utterance_raw_text: string;
  };
  onAccept: () => void;
  onReject: () => void;
  onClickContext: () => void;
  disabled: boolean;
}) {
  const confidencePct = Math.round(suggestion.ai_confidence * 100);
  const context = highlightSuggestionContext(suggestion.utterance_raw_text, suggestion.raw_text);

  return (
    <div className="border-b border-slate-100 pb-2 last:border-b-0">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-[12px] text-rose-700">
          {suggestion.raw_text}
        </span>
        <span className="text-[12px] text-slate-400">→</span>
        <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[12px] font-medium text-emerald-700">
          {suggestion.ai_suggestion}
        </span>
        <span className="ml-auto text-[11px] text-slate-400">{confidencePct}%</span>
      </div>

      <button
        type="button"
        className="mb-1 block w-full cursor-pointer rounded text-left text-[12px] leading-5 text-slate-500 hover:bg-slate-50"
        onClick={onClickContext}
        title="Jump to this word in the transcript"
      >
        {context.before}
        <mark className="rounded bg-amber-100 px-0.5">{context.match}</mark>
        {context.after}
      </button>

      <div className="mb-2 text-[11px] italic text-slate-400">
        {suggestion.ai_suggestion_reason}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
          onClick={onAccept}
          disabled={disabled}
        >
          ✓ Accept
        </button>
        <button
          type="button"
          className="rounded border border-rose-200 bg-rose-50 px-2.5 py-1 text-[12px] text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
          onClick={onReject}
          disabled={disabled}
        >
          ✕ Reject
        </button>
      </div>
    </div>
  );
}

function highlightSuggestionContext(text: string, token: string): {
  before: string;
  match: string;
  after: string;
} {
  const index = text.toLowerCase().indexOf(token.toLowerCase());
  if (index < 0) {
    return {
      before: text,
      match: "",
      after: "",
    };
  }

  return {
    before: text.slice(0, index),
    match: text.slice(index, index + token.length),
    after: text.slice(index + token.length),
  };
}
