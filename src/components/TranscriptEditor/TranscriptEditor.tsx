import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { WordMark } from "../../extensions/WordMark";
import { UtteranceNode } from "../../extensions/UtteranceNode";
import { PageBreakNode } from "../../extensions/PageBreakNode";
import { ExhibitRefNode } from "../../extensions/ExhibitRefNode";
import { ExhibitRefNodeView } from "./ExhibitRefNodeView";
import { buildEditorContent } from "../../lib/buildEditorContent";
import { extractUtteranceTextsFromDoc } from "../../lib/format/editorFragments";
import { buildWordTimings, findWordAtTime } from "../../lib/wordTimings";
import { useDocument } from "../../context/DocumentContext";
import { useAudio } from "../../context/AudioContext";
import { useEditorContext } from "../../context/EditorContext";
import { useIntake } from "../../context/useIntake";
import { createConfidencePlugin } from "../../extensions/ConfidencePlugin";
import { createSuggestionPlugin } from "../../extensions/SuggestionPlugin";
import { StructureReviewBanner } from "../StructureReviewBanner/StructureReviewBanner";
import { AIReviewBanner } from "../AIReviewBanner/AIReviewBanner";
import { UtteranceContextMenu } from "../UtteranceContextMenu/UtteranceContextMenu";
import { TranscriptProcessingMenu } from "./TranscriptProcessingMenu";
import { CanonicalBaselineView } from "./CanonicalBaselineView";

interface Props {
  readOnly: boolean;
}

// Wrap ProseMirror plugins in TipTap Extensions. Both are instantiated once
// here so the plugin instances are stable across renders.
const confidencePmPlugin = createConfidencePlugin();
const ConfidenceExtension = Extension.create({
  name: "confidenceReview",
  addProseMirrorPlugins() {
    return [confidencePmPlugin];
  },
});

const suggestionPmPlugin = createSuggestionPlugin();
const SuggestionExtension = Extension.create({
  name: "suggestionOverlay",
  addProseMirrorPlugins() {
    return [suggestionPmPlugin];
  },
});

// Extensions are defined outside the component so the array reference is stable
// and useEditor does not reinstantiate on every render.
const EXTENSIONS = [
  StarterKit.configure({
    paragraph: false,
    heading: false,
    blockquote: false,
    codeBlock: false,
    code: false,
    horizontalRule: false,
    listItem: false,
    orderedList: false,
    bulletList: false,
    strike: false,
    bold: false,
    italic: false,
    undoRedo: false,
    dropcursor: false,
    link: false,
    underline: false,
    listKeymap: false,
    trailingNode: false,
  }),
  UtteranceNode,
  PageBreakNode,
  ExhibitRefNode.extend({
    addNodeView() {
      return ReactNodeViewRenderer(ExhibitRefNodeView);
    },
  }),
  WordMark,
  ConfidenceExtension,
  SuggestionExtension,
];

function extractUtteranceTexts(editor: Editor): Map<string, string> {
  return extractUtteranceTextsFromDoc(editor.state.doc);
}

export type UtteranceTextChange = {
  utteranceId: string;
  oldText: string;
  newText: string;
};

export function diffUtteranceTextSnapshots(
  previousTexts: Map<string, string>,
  nextTexts: Map<string, string>
): UtteranceTextChange[] {
  const changes: UtteranceTextChange[] = [];

  nextTexts.forEach((newText, utteranceId) => {
    const oldText = previousTexts.get(utteranceId);
    if (oldText !== undefined && oldText !== newText) {
      changes.push({ utteranceId, oldText, newText });
    }
  });

  return changes;
}

export function TranscriptEditor({ readOnly }: Props) {
  const { state, editUtterance, setActive, confirmStructure, keepRawLabels } = useDocument();
  const audio = useAudio();
  const { setEditor, showInterpreterLayer, languageMap } = useEditorContext();
  const { record } = useIntake();
  const { playing } = audio;

  // Refs for RAF highlight loop
  const lastWordIdRef = useRef<string | null>(null);
  const lastElsRef = useRef<HTMLElement[]>([]);
  const lastScrollAtRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const evidenceRootRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    utteranceId: string;
    speakerId: string;
  } | null>(null);

  // Snapshot of utterance texts at the last content-push.
  // Used to diff TipTap updates → only call editUtterance on changed utterances.
  const prevTextsRef = useRef<Map<string, string>>(new Map());

  // Stable ref to editUtterance so the onUpdate effect doesn't re-register.
  const editUtteranceRef = useRef(editUtterance);
  editUtteranceRef.current = editUtterance;

  const isCanonical = state.renderLayer === "canonical";

  // The reporter editor ALWAYS renders the working transcript — never baseline.
  // The Canonical Baseline is a separate read-only view (CanonicalBaselineView),
  // so switching layers never rebuilds/replaces the editor content and can never
  // drop unsaved reporter edits or autosave baseline tokens over corrections.
  const editorContent = useMemo(
    () => (state.document ? buildEditorContent(state.document, {
      languageMap,
      structureConfirmed: state.structureConfirmed,
      keepRawLabels: state.keepRawLabels,
      record,
    }) : null),
    [languageMap, record, state.document, state.keepRawLabels, state.structureConfirmed]
  );

  const wordTimings = useMemo(
    () => buildWordTimings(state.document),
    [state.document]
  );
  const aiReviewBannerState = useMemo(() => {
    const words = (state.document?.words ?? []) as Array<{
      ai_suggestion?: string | null;
      ai_suggestion_status?: string | null;
      text: string;
      raw_text: string;
    }>;

    return words.reduce(
      (totals, word) => {
        if (!word.ai_suggestion) {
          return totals;
        }
        if (word.ai_suggestion_status === "pending") {
          totals.pendingCount += 1;
        } else if (word.ai_suggestion_status === "accepted" && word.text !== word.raw_text) {
          totals.autoAppliedCount += 1;
        }
        return totals;
      },
      { pendingCount: 0, autoAppliedCount: 0 },
    );
  }, [state.document]);

  const editor = useEditor({
    extensions: EXTENSIONS,
    editable: !readOnly,
    immediatelyRender: false,
  });

  // Register editor instance in shared context so the ConfidencePanel can dispatch plugin transactions.
  useEffect(() => {
    setEditor(editor ?? null);
    return () => setEditor(null);
  }, [editor, setEditor]);

  // Push document content into TipTap whenever the source document changes.
  // false = don't fire an update event (avoids false-dirty on initial load).
  useEffect(() => {
    if (!editor || !editorContent) return;
    editor.commands.setContent(editorContent, { emitUpdate: false });

    // Snapshot the initial texts so the first real edit can be diffed.
    prevTextsRef.current = extractUtteranceTexts(editor);
  }, [editor, editorContent]);

  // Wire TipTap onUpdate → DocumentContext.editUtterance.
  // Uses a stable ref for editUtterance so this effect doesn't re-run on context changes.
  useEffect(() => {
    if (!editor) return;

    function handleUpdate() {
      const newTexts = extractUtteranceTexts(editor!);
      diffUtteranceTextSnapshots(prevTextsRef.current, newTexts).forEach((change) => {
        editUtteranceRef.current(change.utteranceId, change.oldText, change.newText);
      });
      prevTextsRef.current = newTexts;
    }

    editor.on("update", handleUpdate);
    return () => { editor.off("update", handleUpdate); };
  }, [editor]);

  // Stable ref to setActive
  const setActiveRef = useRef(setActive);
  setActiveRef.current = setActive;

  // ── Transcript → Audio ───────────────────────────────────────────────────
  // Click on any element with data-word-id → seek + play
  // Click on any utterance block → set active utterance for sidebar reassignment
  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;

      // Set active utterance on any click inside an utterance block
      const uttEl = target.closest<HTMLElement>("[data-utterance-id]");
      if (uttEl?.dataset.utteranceId) {
        setActiveRef.current(uttEl.dataset.utteranceId);
      }

      // Word click → seek audio
      const wordEl = target.closest<HTMLElement>("[data-word-id]");
      if (!wordEl) return;
      const t = parseFloat(wordEl.dataset.start ?? "");
      if (!Number.isFinite(t)) return;
      audio.seekTo(t);
      audio.play();
    }

    editorDom.addEventListener("click", handleClick);
    return () => editorDom.removeEventListener("click", handleClick);
  }, [editor, audio]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const editorDom = editor.view.dom;

    function handleContextMenu(event: MouseEvent) {
      // Canonical Baseline is immutable: no speaker reassignment (the context
      // menu persists via saveSpeakers, which must never fire from an evidence view).
      if (isCanonical) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const utteranceEl = target?.closest<HTMLElement>("[data-utterance-id]");
      if (!utteranceEl?.dataset.utteranceId || !utteranceEl.dataset.speakerId) {
        return;
      }

      event.preventDefault();
      setActiveRef.current(utteranceEl.dataset.utteranceId);
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        utteranceId: utteranceEl.dataset.utteranceId,
        speakerId: utteranceEl.dataset.speakerId,
      });
    }

    editorDom.addEventListener("contextmenu", handleContextMenu);
    return () => editorDom.removeEventListener("contextmenu", handleContextMenu);
  }, [editor, isCanonical]);

  // Clear any open context menu when switching to the Canonical Baseline so it
  // cannot reappear at stale coordinates (with stale utterance context) on
  // returning to Reporter View.
  useEffect(() => {
    if (isCanonical) setContextMenu(null);
  }, [isCanonical]);

  const clearHighlightedWord = useCallback(() => {
    lastElsRef.current.forEach((el) => el.classList.remove("word-playing"));
    lastElsRef.current = [];
    lastWordIdRef.current = null;
  }, []);

  const maybeScrollWordIntoView = useCallback((element: HTMLElement) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const now = performance.now();
    if (now - lastScrollAtRef.current <= 600) return;

    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const isVisible =
      elementRect.top >= containerRect.top &&
      elementRect.bottom <= containerRect.bottom;

    if (isVisible) return;

    element.scrollIntoView({ behavior: "auto", block: "nearest" });
    lastScrollAtRef.current = now;
  }, []);

  // ── Audio → Transcript ───────────────────────────────────────────────────
  // RAF loop: binary search → direct DOM classList toggle, no React state.
  // Auto-scroll throttled to once per 600 ms.
  const highlightLoop = useCallback(() => {
    if (!editor || !playing) {
      rafRef.current = 0;
      return;
    }

    const t = audio.currentTimeRef.current;
    const wordId = findWordAtTime(wordTimings, t);

    if (wordId !== lastWordIdRef.current) {
      clearHighlightedWord();
      if (wordId) {
        // Query the currently VISIBLE surface: the read-only baseline view in
        // canonical mode, otherwise the editable editor. (In canonical mode the
        // editor is unmounted, so there are no duplicate data-word-id nodes.)
        const root: ParentNode | null = isCanonical ? evidenceRootRef.current : editor.view.dom;
        if (root) {
          const selector = `[data-word-id="${CSS.escape(wordId)}"]`;
          const els = Array.from(root.querySelectorAll<HTMLElement>(selector));
          if (els.length > 0) {
            els.forEach((el) => el.classList.add("word-playing"));
            lastElsRef.current = els;
            maybeScrollWordIntoView(els[0]);
          }
          // Commit once the surface is MOUNTED, even if this word has no node
          // (e.g. a word with empty raw_text is omitted from the baseline view).
          // Otherwise the loop would re-clear/re-query it every frame forever.
          lastWordIdRef.current = wordId;
        }
        // root null → surface not mounted yet (just switched layers): leave
        // lastWordIdRef null (cleared above) so the next frame retries.
      }
    }

    rafRef.current = requestAnimationFrame(highlightLoop);
  }, [audio.currentTimeRef, clearHighlightedWord, editor, isCanonical, maybeScrollWordIntoView, playing, wordTimings]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      clearHighlightedWord();
      return;
    }

    rafRef.current = requestAnimationFrame(highlightLoop);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [clearHighlightedWord, highlightLoop, playing]);

  // On a layer switch during playback, drop the highlight + reset the active
  // word so the follow-along loop re-applies "word-playing" to the newly
  // visible surface on the next frame (instead of waiting for audio to advance).
  useEffect(() => {
    clearHighlightedWord();
  }, [isCanonical, clearHighlightedWord]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (state.loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transcript-bg">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading transcript…</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transcript-bg p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-sm font-semibold text-red-700 mb-1">
            Failed to load transcript
          </p>
          <p className="text-xs text-red-500">{state.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 min-h-0 overflow-y-auto transcript-scroll bg-transcript-bg"
      data-show-interpreter={showInterpreterLayer ? "true" : "false"}
    >
      {!isCanonical && !state.structureConfirmed && (
        <StructureReviewBanner
          onConfirm={confirmStructure}
          onDismiss={keepRawLabels}
        />
      )}
      {!isCanonical && (
        <AIReviewBanner
          jobId={state.document?.job_id ?? state.jobId}
          pendingCount={aiReviewBannerState.pendingCount}
          autoAppliedCount={aiReviewBannerState.autoAppliedCount}
        />
      )}
      <div className="sticky top-0 z-20 flex items-center justify-end border-b border-slate-100 bg-transcript-bg/80 px-6 py-2 backdrop-blur">
        <TranscriptProcessingMenu document={state.document} />
      </div>
      <div className="transcript-page-area">
        {/* Document caption. The Workspace is a working draft and must NOT be
            labeled "CERTIFIED" before certification (ADR-0012 / OQ-5). The
            certified title belongs to the certification/export render path.
            The Canonical Baseline shows a read-only baseline header.
            NOTE: "WORKING DRAFT — NOT CERTIFIED" is a placeholder pending
            Miah's confirmed wording (a one-string swap when she confirms). */}
        <div className="transcript-header">
          <p className="transcript-header-title">
            {isCanonical ? "CANONICAL BASELINE — READ-ONLY" : "WORKING DRAFT — NOT CERTIFIED"}
          </p>
          {state.document && (
            <p className="transcript-header-meta">
              {state.document.job_id}
              {"  ·  "}
              {state.document.utterances.length} entries
              {"  ·  "}
              {state.document.words.length} words
              {isCanonical ? "  ·  canonical baseline · read-only" : ""}
            </p>
          )}
        </div>

        {/* In recognition mode the editor's DOM is unmounted entirely so there
            are NO duplicate/hidden data-word-id nodes for global querySelector
            flows (confidence nav, suggestion scroll, corrections) to match.
            Unsaved edits survive because the TipTap Editor instance — not
            EditorContent — owns the document state, and editorContent does not
            depend on renderLayer, so no setContent runs on the switch. */}
        {!isCanonical && <EditorContent editor={editor} className="tiptap-transcript" />}
        {isCanonical && <CanonicalBaselineView document={state.document} rootRef={evidenceRootRef} />}
      </div>
      {contextMenu && !isCanonical && (
        <UtteranceContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          utteranceId={contextMenu.utteranceId}
          currentSpeakerId={contextMenu.speakerId}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
