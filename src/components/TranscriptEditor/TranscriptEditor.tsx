import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useCallback, useMemo } from "react";
import { WordMark } from "../../extensions/WordMark";
import { UtteranceNode } from "../../extensions/UtteranceNode";
import { PageBreakNode } from "../../extensions/PageBreakNode";
import { ExhibitRefNode } from "../../extensions/ExhibitRefNode";
import { ExhibitRefNodeView } from "./ExhibitRefNodeView";
import { buildEditorContent } from "../../lib/buildEditorContent";
import { buildWordTimings, findWordAtTime } from "../../lib/wordTimings";
import { useDocument } from "../../context/DocumentContext";
import { useAudio } from "../../context/AudioContext";
import { useEditorContext } from "../../context/EditorContext";
import { createConfidencePlugin } from "../../extensions/ConfidencePlugin";
import { createSuggestionPlugin } from "../../extensions/SuggestionPlugin";

interface Props {
  readOnly: boolean;
}

const ENABLE_DISPLAY_TURN_SEGMENTATION = true;

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

function extractLegacyUtteranceTexts(editor: Editor): Map<string, string> {
  const texts = new Map<string, string>();
  editor.state.doc.descendants((node) => {
    if (node.type.name === "utterance") {
      texts.set(node.attrs.utterance_id as string, node.textContent);
    }
  });
  return texts;
}

// Extract utterance_id → text mapping from the live ProseMirror document.
function extractUtteranceTexts(editor: Editor): Map<string, string> {
  if (!ENABLE_DISPLAY_TURN_SEGMENTATION) {
    return extractLegacyUtteranceTexts(editor);
  }

  const texts = new Map<string, string>();
  const orderedTexts = new Map<string, string[]>();

  editor.state.doc.descendants((node) => {
    if (node.type.name === "utterance") {
      const utteranceId = node.attrs.utterance_id as string;
      const parts = orderedTexts.get(utteranceId) ?? [];
      parts.push(node.textContent);
      orderedTexts.set(utteranceId, parts);
    }
  });

  orderedTexts.forEach((parts, utteranceId) => {
    texts.set(utteranceId, parts.join(" "));
  });

  return texts;
}

export function TranscriptEditor({ readOnly }: Props) {
  const { state, editUtterance, setActive } = useDocument();
  const audio = useAudio();
  const { setEditor, showInterpreterLayer, languageMap } = useEditorContext();
  const { playing } = audio;

  // Refs for RAF highlight loop
  const lastWordIdRef = useRef<string | null>(null);
  const lastElsRef = useRef<HTMLElement[]>([]);
  const lastScrollAtRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Snapshot of utterance texts at the last content-push.
  // Used to diff TipTap updates → only call editUtterance on changed utterances.
  const prevTextsRef = useRef<Map<string, string>>(new Map());

  // Stable ref to editUtterance so the onUpdate effect doesn't re-register.
  const editUtteranceRef = useRef(editUtterance);
  editUtteranceRef.current = editUtterance;

  const editorContent = useMemo(
    () => (state.document ? buildEditorContent(state.document, languageMap) : null),
    [state.document, languageMap]
  );

  const wordTimings = useMemo(
    () => buildWordTimings(state.document),
    [state.document]
  );

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
      newTexts.forEach((newText, uttId) => {
        const prev = prevTextsRef.current.get(uttId);
        if (prev !== undefined && prev !== newText) {
          editUtteranceRef.current(uttId, prev, newText);
        }
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
        const selector = `[data-word-id="${CSS.escape(wordId)}"]`;
        const els = Array.from(
          editor.view.dom.querySelectorAll<HTMLElement>(selector)
        );
        els.forEach((el) => el.classList.add("word-playing"));
        lastElsRef.current = els;
        lastWordIdRef.current = wordId;

        const firstEl = els[0];
        if (firstEl) maybeScrollWordIntoView(firstEl);
      }
    }

    rafRef.current = requestAnimationFrame(highlightLoop);
  }, [audio.currentTimeRef, clearHighlightedWord, editor, maybeScrollWordIntoView, playing, wordTimings]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="transcript-page-area">
        {/* Document caption */}
        <div className="transcript-header">
          <p className="transcript-header-title">
            CERTIFIED TRANSCRIPT OF DEPOSITION
          </p>
          {state.document && (
            <p className="transcript-header-meta">
              {state.document.job_id}
              {"  ·  "}
              {state.document.utterances.length} entries
              {"  ·  "}
              {state.document.words.length} words
            </p>
          )}
        </div>

        <EditorContent editor={editor} className="tiptap-transcript" />
      </div>
    </div>
  );
}
