import type { LucideIcon } from "lucide-react";
import type { ChangeLogEntry } from "../../types";
import { useDocument } from "../../context/DocumentContext";
import { Clock, Edit3, Sparkles, Pencil } from "lucide-react";

const SOURCE_LABEL: Record<ChangeLogEntry["source"], { label: string; color: string; Icon: LucideIcon }> = {
  "editor":             { label: "Typed",    color: "text-slate-500 bg-slate-100",   Icon: Pencil    },
  "suggestion-accept":  { label: "Accepted", color: "text-emerald-700 bg-emerald-100", Icon: Sparkles },
  "suggestion-edit":    { label: "Edited",   color: "text-blue-700 bg-blue-100",     Icon: Edit3     },
};

export function ChangeLogPanel() {
  const { state } = useDocument();
  const log = state.changeLog;

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <Clock size={13} className="text-slate-500" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Audit Trail
        </h2>
        {log.length > 0 && (
          <span className="ml-auto text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
            {log.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {log.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">
            No edits yet. Changes appear here in order.
          </p>
        )}
        {log.map((entry) => (
          <ChangeEntry key={entry.change_id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function ChangeEntry({ entry }: { entry: ChangeLogEntry }) {
  const ts = new Date(entry.timestamp);
  const timeStr = ts.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const meta = SOURCE_LABEL[entry.source] ?? SOURCE_LABEL["editor"];
  const { Icon } = meta;

  // Compute a word-level diff when word_id is set (suggestion path)
  // For editor path, show utterance-level before/after
  const showWordLevel = !!entry.word_id;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs space-y-1.5">
      {/* Header row */}
      <div className="flex items-center gap-1.5 justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${meta.color}`}>
            <Icon size={9} />
            {meta.label}
          </span>
          <span className="font-mono text-slate-400 truncate text-[10px]">
            {showWordLevel ? entry.word_id : entry.utterance_id}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 shrink-0 font-mono">{timeStr}</span>
      </div>

      {/* Diff */}
      <div className="space-y-0.5 pl-1 border-l-2 border-slate-200">
        <p className="text-slate-400 line-through leading-snug truncate font-serif">
          {entry.old_text}
        </p>
        <p className="text-slate-800 font-semibold leading-snug font-serif">
          {entry.new_text}
        </p>
      </div>

      {/* Suggestion linkage */}
      {entry.suggestion_id && (
        <p className="text-[10px] text-slate-400 font-mono">
          {entry.suggestion_id}
        </p>
      )}
    </div>
  );
}
