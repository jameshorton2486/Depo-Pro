import { useState, useEffect, useCallback, useRef } from "react";
import type { AiSuggestion } from "../../api/types";
import { workspaceApi } from "../../api/workspaceService";
import { useDocument } from "../../context/DocumentContext";
import { useEditorContext } from "../../context/EditorContext";
import { suggestionPluginKey } from "../../extensions/SuggestionPlugin";
import {
  CheckCircle,
  XCircle,
  Edit3,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function confColor(c: number) {
  const pct = Math.round(c * 100);
  if (pct >= 85) return { text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" };
  if (pct >= 65) return { text: "text-amber-700",   bg: "bg-amber-50 border-amber-200"   };
  return         { text: "text-red-700",             bg: "bg-red-50 border-red-200"       };
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function SuggestionsPanel() {
  const { state, logSuggestionEdit } = useDocument();
  const { editor } = useEditorContext();
  const jobId = state.document?.job_id ?? "demo";

  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [loading, setLoading]         = useState(true);
  const [acting, setActing]           = useState<string | null>(null);
  // editing state: suggestion_id → draft text
  const [editDrafts, setEditDrafts]   = useState<Record<string, string>>({});

  // Load suggestions
  useEffect(() => {
    workspaceApi
      .getSuggestions(jobId)
      .then((s) => {
        setSuggestions(s);
        // Seed the suggestion decoration plugin with pending word_ids
        if (editor) {
          const pending = s
            .filter((sg) => sg.status === "pending")
            .map((sg) => sg.word_id);
          if (pending.length > 0) {
            const tr = editor.state.tr.setMeta(suggestionPluginKey, {
              type: "SET_PENDING",
              word_ids: pending,
            });
            editor.view.dispatch(tr);
          }
        }
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  // editor intentionally omitted — we only need it once on first load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // When editor becomes available after suggestions are loaded, seed the plugin
  const seededRef = useRef(false);
  useEffect(() => {
    if (!editor || seededRef.current || suggestions.length === 0) return;
    const pending = suggestions
      .filter((sg) => sg.status === "pending")
      .map((sg) => sg.word_id);
    if (pending.length > 0) {
      const tr = editor.state.tr.setMeta(suggestionPluginKey, {
        type: "SET_PENDING",
        word_ids: pending,
      });
      editor.view.dispatch(tr);
      seededRef.current = true;
    }
  }, [editor, suggestions]);

  // Apply a word-level text replacement to the TipTap doc.
  // Finds the first text node carrying a wordMark with the given word_id,
  // replaces it with newText while preserving all marks and marking edited=true.
  const applyWordEdit = useCallback(
    (wordId: string, newText: string): boolean => {
      if (!editor) return false;
      const { tr, doc, schema } = editor.state;
      let applied = false;

      doc.descendants((node, pos) => {
        if (applied || !node.isText) return;
        const wm = node.marks.find((m) => m.type.name === "wordMark");
        if (!wm || wm.attrs.word_id !== wordId) return;

        // Replace this text node with updated text + updated mark attrs
        const updatedMark = schema.marks.wordMark.create({
          ...wm.attrs,
          edited: true,
        });
        const updatedMarks = node.marks.map((m) =>
          m.type.name === "wordMark" ? updatedMark : m
        );
        const newNode = schema.text(newText, updatedMarks);
        tr.replaceWith(pos, pos + node.nodeSize, newNode);
        applied = true;
      });

      if (applied) {
        editor.view.dispatch(tr);
      }
      return applied;
    },
    [editor]
  );

  // Find the utterance text after a word replacement (for the audit log)
  const getUtteranceTextFromEditor = useCallback(
    (uttId: string): string => {
      if (!editor) return "";
      let text = "";
      editor.state.doc.descendants((node) => {
        if (node.type.name === "utterance" && node.attrs.utterance_id === uttId) {
          text = node.textContent;
        }
      });
      return text;
    },
    [editor]
  );

  const clearSuggestionDecoration = useCallback(
    (wordId: string) => {
      if (!editor) return;
      const tr = editor.state.tr.setMeta(suggestionPluginKey, {
        type: "REMOVE_PENDING",
        word_ids: [wordId],
      });
      editor.view.dispatch(tr);
    },
    [editor]
  );

  const scrollToWord = useCallback((wordId: string) => {
    const el = document.querySelector<HTMLElement>(`[data-word-id="${wordId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("word-conf-focus");
      setTimeout(() => el.classList.remove("word-conf-focus"), 1200);
    }
  }, []);

  const handleAccept = useCallback(
    async (sug: AiSuggestion) => {
      setActing(sug.suggestion_id);
      try {
        const oldText = sug.original_text;
        const newText = sug.suggested_text;

        applyWordEdit(sug.word_id, newText);
        clearSuggestionDecoration(sug.word_id);

        const uttText = getUtteranceTextFromEditor(sug.utterance_id);
        logSuggestionEdit(
          sug.utterance_id,
          sug.word_id,
          oldText,
          uttText || newText,
          "suggestion-accept",
          sug.suggestion_id
        );

        await workspaceApi.resolveSuggestion(jobId, sug.suggestion_id, { action: "accept" });
        setSuggestions((prev) =>
          prev.map((s) =>
            s.suggestion_id === sug.suggestion_id
              ? { ...s, status: "accepted" }
              : s
          )
        );
      } finally {
        setActing(null);
      }
    },
    [applyWordEdit, clearSuggestionDecoration, getUtteranceTextFromEditor, logSuggestionEdit, jobId]
  );

  const handleReject = useCallback(
    async (sug: AiSuggestion) => {
      setActing(sug.suggestion_id);
      try {
        clearSuggestionDecoration(sug.word_id);
        await workspaceApi.resolveSuggestion(jobId, sug.suggestion_id, { action: "reject" });
        setSuggestions((prev) =>
          prev.map((s) =>
            s.suggestion_id === sug.suggestion_id
              ? { ...s, status: "rejected" }
              : s
          )
        );
      } finally {
        setActing(null);
      }
    },
    [clearSuggestionDecoration, jobId]
  );

  const handleEditCommit = useCallback(
    async (sug: AiSuggestion) => {
      const editedText = editDrafts[sug.suggestion_id]?.trim();
      if (!editedText) return;
      setActing(sug.suggestion_id);
      try {
        applyWordEdit(sug.word_id, editedText);
        clearSuggestionDecoration(sug.word_id);

        const uttText = getUtteranceTextFromEditor(sug.utterance_id);
        logSuggestionEdit(
          sug.utterance_id,
          sug.word_id,
          sug.original_text,
          uttText || editedText,
          "suggestion-edit",
          sug.suggestion_id
        );

        await workspaceApi.resolveSuggestion(jobId, sug.suggestion_id, {
          action: "edit",
          edited_text: editedText,
        });
        setSuggestions((prev) =>
          prev.map((s) =>
            s.suggestion_id === sug.suggestion_id
              ? { ...s, status: "accepted", suggested_text: editedText }
              : s
          )
        );
        setEditDrafts((d) => { const n = { ...d }; delete n[sug.suggestion_id]; return n; });
      } finally {
        setActing(null);
      }
    },
    [editDrafts, applyWordEdit, clearSuggestionDecoration, getUtteranceTextFromEditor, logSuggestionEdit, jobId]
  );

  const pending  = suggestions.filter((s) => s.status === "pending");
  const resolved = suggestions.filter((s) => s.status !== "pending");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <Sparkles size={13} className="text-blue-600" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          AI Review
        </h2>
        {pending.length > 0 && (
          <span className="ml-auto text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
            {pending.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading && (
          <p className="text-xs text-slate-400 text-center py-6">
            Loading suggestions…
          </p>
        )}

        {!loading && suggestions.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <CheckCircle size={28} className="text-emerald-400" />
            <p className="text-xs font-semibold text-slate-600">No suggestions</p>
            <p className="text-[11px] text-slate-400">
              AI review found no issues.
            </p>
          </div>
        )}

        {/* Pending suggestions */}
        {pending.map((sug) => {
          const isEditing = sug.suggestion_id in editDrafts;
          const isActing  = acting === sug.suggestion_id;
          const colors    = confColor(sug.confidence);
          const pct       = Math.round(sug.confidence * 100);

          return (
            <div
              key={sug.suggestion_id}
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2.5"
            >
              {/* Top row: utterance id + confidence */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => scrollToWord(sug.word_id)}
                  className="text-[10px] font-mono text-blue-600 hover:underline"
                  title="Scroll to word in transcript"
                >
                  {sug.utterance_id}
                </button>
                <span className={`text-[10px] font-bold ${colors.text}`}>
                  {pct}%
                </span>
              </div>

              {/* Diff row */}
              <div className={`rounded border px-2.5 py-2 ${colors.bg} space-y-1`}>
                <div className="flex items-center gap-1.5 text-xs font-serif">
                  <span className="line-through text-slate-500 shrink-0">
                    {sug.original_text}
                  </span>
                  <ArrowRight size={11} className="text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-800 shrink-0">
                    {sug.suggested_text}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 italic leading-snug">
                  {sug.reason}
                </p>
              </div>

              {/* Edit mode */}
              {isEditing && (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={editDrafts[sug.suggestion_id]}
                    onChange={(e) =>
                      setEditDrafts((d) => ({
                        ...d,
                        [sug.suggestion_id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEditCommit(sug);
                      if (e.key === "Escape")
                        setEditDrafts((d) => {
                          const n = { ...d };
                          delete n[sug.suggestion_id];
                          return n;
                        });
                    }}
                    autoFocus
                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 font-serif"
                    placeholder="Type your correction…"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleEditCommit(sug)}
                      disabled={isActing || !editDrafts[sug.suggestion_id]?.trim()}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-40 transition-colors font-medium"
                    >
                      <CheckCircle size={10} /> Apply
                    </button>
                    <button
                      onClick={() =>
                        setEditDrafts((d) => {
                          const n = { ...d };
                          delete n[sug.suggestion_id];
                          return n;
                        })
                      }
                      className="text-xs px-2 py-1 border border-slate-300 rounded hover:bg-white transition-colors text-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!isEditing && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleAccept(sug)}
                    disabled={isActing}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-40 transition-colors font-medium"
                  >
                    <CheckCircle size={10} />
                    Accept
                  </button>
                  <button
                    onClick={() =>
                      setEditDrafts((d) => ({
                        ...d,
                        [sug.suggestion_id]: sug.suggested_text,
                      }))
                    }
                    disabled={isActing}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-slate-300 bg-white rounded hover:bg-slate-50 disabled:opacity-40 transition-colors text-slate-700 font-medium"
                  >
                    <Edit3 size={10} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleReject(sug)}
                    disabled={isActing}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 transition-colors text-slate-500"
                  >
                    <XCircle size={10} />
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Resolved section */}
        {resolved.length > 0 && (
          <ResolvedSection suggestions={resolved} />
        )}
      </div>
    </div>
  );
}

// ─── Resolved section ─────────────────────────────────────────────────────────

function ResolvedSection({ suggestions }: { suggestions: AiSuggestion[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide hover:text-slate-600 transition-colors py-1"
      >
        <span className="flex-1 h-px bg-slate-200" />
        <span>{suggestions.length} resolved</span>
        <RotateCcw
          size={10}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
        <span className="flex-1 h-px bg-slate-200" />
      </button>

      {open && (
        <div className="space-y-2 mt-1">
          {suggestions.map((sug) => {
            const accepted = sug.status === "accepted";
            return (
              <div
                key={sug.suggestion_id}
                className={`rounded-lg border p-2.5 text-xs space-y-1 ${
                  accepted
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-slate-400">{sug.utterance_id}</span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide ${
                      accepted ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    {sug.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-serif">
                  <span className="line-through text-slate-400">
                    {sug.original_text}
                  </span>
                  <ArrowRight size={10} className="text-slate-300" />
                  <span
                    className={
                      accepted ? "font-semibold text-slate-700" : "text-slate-400"
                    }
                  >
                    {sug.suggested_text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
