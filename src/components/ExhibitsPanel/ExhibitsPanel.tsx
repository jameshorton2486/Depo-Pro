import type React from "react";
import { useState, useEffect, useCallback } from "react";
import type { Exhibit } from "../../api/types";
import { workspaceApi } from "../../api/workspaceService";
import { useDocument } from "../../context/DocumentContext";
import { useEditorContext } from "../../context/EditorContext";
import { ExhibitViewerProvider } from "../../context/ExhibitViewerContext";
import {
  Paperclip,
  ExternalLink,
  X,
  Plus,
  FileText,
  ChevronRight,
} from "lucide-react";

// ─── Provider wrapper ─────────────────────────────────────────────────────────
// Wraps the whole DepoEditor tree so ExhibitRefNodeViews can call openViewer.
// This is exported and used in DepoEditor.tsx.

interface ExhibitsPanelProviderProps {
  children: React.ReactNode;
}

export function ExhibitsPanelProvider({ children }: ExhibitsPanelProviderProps) {
  const { state } = useDocument();
  const jobId = state.document?.job_id ?? "demo";
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [viewerExhibit, setViewerExhibit] = useState<Exhibit | null>(null);

  useEffect(() => {
    workspaceApi.getExhibits(jobId).then(setExhibits).catch(() => {});
  }, [jobId]);

  const openViewer = useCallback((exhibit: Exhibit) => {
    setViewerExhibit(exhibit);
  }, []);

  return (
    <ExhibitViewerProvider exhibits={exhibits} openViewer={openViewer}>
      {children}
      {viewerExhibit && (
        <ExhibitSideViewer
          exhibit={viewerExhibit}
          onClose={() => setViewerExhibit(null)}
        />
      )}
    </ExhibitViewerProvider>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function ExhibitsPanel() {
  const { state } = useDocument();
  const { editor } = useEditorContext();
  const jobId = state.document?.job_id ?? "demo";

  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerExhibit, setViewerExhibit] = useState<Exhibit | null>(null);
  const [inserting, setInserting] = useState<string | null>(null);

  useEffect(() => {
    workspaceApi
      .getExhibits(jobId)
      .then(setExhibits)
      .catch(() => setExhibits([]))
      .finally(() => setLoading(false));
  }, [jobId]);

  const insertExhibitRef = useCallback(
    (exhibit: Exhibit) => {
      if (!editor) return;
      setInserting(exhibit.exhibit_id);

      // Insert the exhibitRef atom node at the current selection / cursor.
      // If nothing is selected, inserts at end of current block.
      editor
        .chain()
        .focus()
        .insertContent({
          type: "exhibitRef",
          attrs: {
            exhibit_id: exhibit.exhibit_id,
            label: exhibit.label,
          },
        })
        .run();

      setTimeout(() => setInserting(null), 600);
    },
    [editor]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <Paperclip size={13} className="text-slate-500" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Exhibits
        </h2>
        {exhibits.length > 0 && (
          <span className="ml-auto text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
            {exhibits.length}
          </span>
        )}
      </div>

      {/* Exhibit list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <p className="text-xs text-slate-400 text-center py-6">
            Loading exhibits…
          </p>
        )}

        {!loading && exhibits.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <FileText size={28} className="text-slate-300" />
            <p className="text-xs text-slate-500">No exhibits attached.</p>
          </div>
        )}

        {exhibits.map((exhibit) => (
          <ExhibitCard
            key={exhibit.exhibit_id}
            exhibit={exhibit}
            inserting={inserting === exhibit.exhibit_id}
            onView={() => setViewerExhibit(exhibit)}
            onInsert={() => insertExhibitRef(exhibit)}
          />
        ))}
      </div>

      {/* Usage hint */}
      {exhibits.length > 0 && (
        <div className="border-t border-slate-200 px-4 py-2.5">
          <p className="text-[10px] text-slate-400 leading-snug">
            Click <strong>Insert</strong> to place a reference chip at the
            current cursor position in the transcript.
          </p>
        </div>
      )}

      {/* Side viewer rendered inside the panel's portal */}
      {viewerExhibit && (
        <ExhibitSideViewer
          exhibit={viewerExhibit}
          onClose={() => setViewerExhibit(null)}
        />
      )}
    </div>
  );
}

// ─── Exhibit card ─────────────────────────────────────────────────────────────

function ExhibitCard({
  exhibit,
  inserting,
  onView,
  onInsert,
}: {
  exhibit: Exhibit;
  inserting: boolean;
  onView: () => void;
  onInsert: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 hover:border-slate-300 transition-colors">
      {/* Label + description */}
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
          <FileText size={13} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800">{exhibit.label}</p>
          <p className="text-[10px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
            {exhibit.description}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        <button
          onClick={onView}
          className="flex items-center gap-1 text-[10px] px-2 py-1 border border-slate-200 rounded hover:bg-slate-50 transition-colors text-slate-600"
        >
          <ChevronRight size={9} />
          View
        </button>
        <button
          onClick={onInsert}
          disabled={inserting}
          className="flex items-center gap-1 text-[10px] px-2 py-1 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-60 transition-colors font-medium ml-auto"
        >
          {inserting ? (
            <span className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Plus size={9} />
          )}
          Insert
        </button>
      </div>
    </div>
  );
}

// ─── Side viewer drawer ────────────────────────────────────────────────────────
// Renders as a fixed overlay panel from the right side.

function ExhibitSideViewer({
  exhibit,
  onClose,
}: {
  exhibit: Exhibit;
  onClose: () => void;
}) {
  const hasRealUrl = exhibit.file_url && exhibit.file_url !== "#";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[480px] max-w-[90vw] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <FileText size={16} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">{exhibit.label}</p>
            <p className="text-[11px] text-slate-500 truncate">{exhibit.description}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {hasRealUrl && (
              <a
                href={exhibit.file_url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded hover:bg-slate-200 text-slate-500 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink size={14} />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center">
          {hasRealUrl ? (
            <iframe
              src={exhibit.file_url}
              className="w-full h-full border-0"
              title={exhibit.label}
            />
          ) : (
            <ExhibitPlaceholder exhibit={exhibit} />
          )}
        </div>
      </div>
    </>
  );
}

function ExhibitPlaceholder({ exhibit }: { exhibit: Exhibit }) {
  return (
    <div className="flex flex-col items-center gap-4 p-10 text-center max-w-sm">
      <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center">
        <FileText size={32} className="text-amber-500" />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-700 mb-1">{exhibit.label}</p>
        <p className="text-sm text-slate-500">{exhibit.description}</p>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 w-full text-left space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Exhibit ID
        </p>
        <p className="text-xs font-mono text-slate-600">{exhibit.exhibit_id}</p>
      </div>
      <p className="text-[11px] text-slate-400 italic">
        Document preview not available in this environment.
        In production, the exhibit PDF or image would render here.
      </p>
    </div>
  );
}
