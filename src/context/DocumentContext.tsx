import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import type {
  EditorDocument,
  UtteranceId,
  Word,
  Speaker,
} from "../api/types";
import type { ChangeLogEntry, ChangeSource } from "../types";
import { workspaceApi, type WorkspaceAudioSegment } from "../api/workspaceService";
import type { CorrectionReport } from "../lib/transcript/correctionOrchestrator";
import { buildCorrectionReport } from "../lib/transcript/correctionOrchestrator";

let _changeIdSeq = 0;
function nextChangeId(): string {
  return `chg_${Date.now()}_${++_changeIdSeq}`;
}

// Which render path drives the editor. Session-only (never persisted).
//   "reporter"  → the working transcript a reporter edits (buildEditorContent).
//                 This is the FRONT DOOR — reporters must land here.
//   "canonical" → "Canonical Baseline": per-word raw_text shown verbatim, but
//                 on the already-normalized CANONICAL document (Recognition +
//                 Normalization — the raw Deepgram payload isn't available
//                 client-side). Reached only via the Pipeline Inspector;
//                 read-only because it is evidence, not a draft. A true
//                 "recognition" layer arrives once raw responses are exposed.
// Defaults to "reporter" so the everyday surface is the usable transcript;
// inspecting the canonical baseline is a deliberate, separate mode.
export type RenderLayer = "reporter" | "canonical";

interface State {
  jobId: string;
  document: EditorDocument | null;
  correctionReport: CorrectionReport | null;
  loading: boolean;
  error: string | null;
  dirty: boolean;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: number | null;
  jobUpdatedAt: string | null;
  speakerMapConfirmed: boolean;
  pipelineState: string | null;
  structureConfirmed: boolean;
  keepRawLabels: boolean;
  renderLayer: RenderLayer;
  audioSegments: WorkspaceAudioSegment[];
  changeLog: ChangeLogEntry[];
  activeUtteranceId: UtteranceId | null;
  workingTexts: Record<UtteranceId, string>;
  wordMap: Record<string, Word>;
  editSeq: number;
  speakersVersion: number;
}

type Action =
  | { type: "LOAD_START" }
  | { type: "LOAD_OK"; doc: EditorDocument; updatedAt: string | null; speakerMapConfirmed: boolean; pipelineState: string | null; audioSegments: WorkspaceAudioSegment[] }
  | { type: "SET_CORRECTION_REPORT"; report: CorrectionReport }
  | { type: "LOAD_ERR"; error: string }
  | { type: "UPDATE_MEDIA_URL"; mediaUrl: string; segmentIndex: number }
  | { type: "SET_ACTIVE"; id: UtteranceId | null }
  | { type: "SET_RENDER_LAYER"; layer: RenderLayer }
  | {
      type: "EDIT_UTTERANCE";
      utterance_id: UtteranceId;
      word_id: string | null;
      old_text: string;
      new_text: string;
      source: ChangeSource;
      suggestion_id?: string;
    }
  | { type: "SAVE_START" }
  | { type: "SAVE_OK"; savedSeq: number; updatedAt: string | null }
  | { type: "SAVE_ERR"; error: string }
  | { type: "UPDATE_SPEAKERS"; speakers: Speaker[] }
  | { type: "SET_TRANSCRIPT_VERSION"; updatedAt: string | null }
  | { type: "SET_SPEAKER_MAP_CONFIRMED"; confirmed: boolean; pipelineState?: string | null }
  | { type: "CONFIRM_STRUCTURE" }
  | { type: "KEEP_RAW_LABELS" }
  | { type: "MARK_REVIEWED"; word_ids: string[] }
  | { type: "MARK_UNREVIEWED"; word_ids: string[] };

function buildWordMap(doc: EditorDocument): Record<string, Word> {
  const m: Record<string, Word> = {};
  for (const w of doc.words) m[w.word_id] = w;
  return m;
}

export function documentReducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };

    case "LOAD_OK":
      return {
        ...state,
        loading: false,
        document: action.doc,
        wordMap: buildWordMap(action.doc),
        workingTexts: {},
        dirty: false,
        changeLog: [],
        editSeq: 0,
        speakersVersion: 0,
        jobUpdatedAt: action.updatedAt,
        speakerMapConfirmed: action.speakerMapConfirmed,
        pipelineState: action.pipelineState,
        structureConfirmed: false,
        keepRawLabels: false,
        audioSegments: action.audioSegments,
      };

    case "SET_CORRECTION_REPORT":
      return { ...state, correctionReport: action.report };

    case "LOAD_ERR":
      return { ...state, loading: false, error: action.error };

    case "UPDATE_MEDIA_URL":
      if (!state.document) return state;
      return {
        ...state,
        document: {
          ...state.document,
          media_url: action.mediaUrl,
        },
        audioSegments: state.audioSegments.map((segment, index) => (
          index === action.segmentIndex
            ? { ...segment, mediaUrl: action.mediaUrl }
            : segment
        )),
      };

    case "SET_ACTIVE":
      return { ...state, activeUtteranceId: action.id };

    case "EDIT_UTTERANCE": {
      const entry: ChangeLogEntry = {
        change_id: nextChangeId(),
        timestamp: Date.now(),
        utterance_id: action.utterance_id,
        word_id: action.word_id,
        old_text: action.old_text,
        new_text: action.new_text,
        source: action.source,
        suggestion_id: action.suggestion_id,
      };
      return {
        ...state,
        workingTexts: {
          ...state.workingTexts,
          [action.utterance_id]: action.new_text,
        },
        dirty: true,
        editSeq: state.editSeq + 1,
        changeLog: [entry, ...state.changeLog].slice(0, 500),
      };
    }

    case "SAVE_START":
      return { ...state, saving: true, saveError: null };

    case "SAVE_OK":
      return {
        ...state,
        saving: false,
        dirty: state.editSeq !== action.savedSeq,
        saveError: null,
        lastSavedAt: Date.now(),
        jobUpdatedAt: action.updatedAt,
      };

    case "SAVE_ERR":
      return { ...state, saving: false, saveError: action.error };

    case "UPDATE_SPEAKERS": {
      if (!state.document) return state;
      return {
        ...state,
        document: { ...state.document, speakers: action.speakers },
        speakersVersion: state.speakersVersion + 1,
      };
    }

    case "SET_TRANSCRIPT_VERSION":
      return { ...state, jobUpdatedAt: action.updatedAt };

    case "SET_SPEAKER_MAP_CONFIRMED":
      return {
        ...state,
        speakerMapConfirmed: action.confirmed,
        pipelineState: action.pipelineState ?? state.pipelineState,
      };

    case "SET_RENDER_LAYER":
      return { ...state, renderLayer: action.layer };

    case "CONFIRM_STRUCTURE":
      return { ...state, structureConfirmed: true, keepRawLabels: false };

    case "KEEP_RAW_LABELS":
      return { ...state, structureConfirmed: true, keepRawLabels: true };

    case "MARK_REVIEWED": {
      if (!state.document) return state;
      const ids = new Set(action.word_ids);
      return {
        ...state,
        wordMap: Object.fromEntries(
          Object.entries(state.wordMap).map(([k, w]) =>
            ids.has(k) ? [k, { ...w, reviewed: true }] : [k, w]
          )
        ),
      };
    }

    case "MARK_UNREVIEWED": {
      if (!state.document) return state;
      const ids = new Set(action.word_ids);
      return {
        ...state,
        wordMap: Object.fromEntries(
          Object.entries(state.wordMap).map(([k, w]) =>
            ids.has(k) ? [k, { ...w, reviewed: false }] : [k, w]
          )
        ),
      };
    }

    default:
      return state;
  }
}

interface ContextValue {
  state: State;
  loadDocument: () => Promise<void>;
  refreshMediaUrl: (segmentIndex?: number) => Promise<string | null>;
  setActive: (id: UtteranceId | null) => void;
  editUtterance: (utterance_id: UtteranceId, old_text: string, new_text: string) => void;
  logSuggestionEdit: (
    utterance_id: UtteranceId,
    word_id: string,
    old_text: string,
    new_text: string,
    source: "suggestion-accept" | "suggestion-edit",
    suggestion_id: string
  ) => void;
  saveNow: () => Promise<boolean>;
  updateSpeakers: (speakers: Speaker[]) => void;
  setTranscriptVersion: (updatedAt: string | null) => void;
  setSpeakerMapConfirmed: (confirmed: boolean, pipelineState?: string | null) => void;
  confirmStructure: () => void;
  keepRawLabels: () => void;
  setRenderLayer: (layer: RenderLayer) => void;
  markReviewed: (word_ids: string[]) => void;
  markUnreviewed: (word_ids: string[]) => void;
  getUtteranceText: (utterance_id: UtteranceId) => string;
}

const Ctx = createContext<ContextValue | null>(null);

export function createInitialDocumentState(jobId: string): State {
  return {
    jobId,
    document: null,
    correctionReport: null,
    loading: false,
    error: null,
    dirty: false,
    saving: false,
    saveError: null,
    lastSavedAt: null,
    jobUpdatedAt: null,
    speakerMapConfirmed: false,
    pipelineState: null,
    structureConfirmed: false,
    keepRawLabels: false,
    renderLayer: "reporter",
    audioSegments: [],
    changeLog: [],
    activeUtteranceId: null,
    workingTexts: {},
    wordMap: {},
    editSeq: 0,
    speakersVersion: 0,
  };
}

export function DocumentProvider({
  jobId,
  children,
}: {
  jobId: string;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(documentReducer, createInitialDocumentState(jobId));

  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDocument = useCallback(async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const loaded = await workspaceApi.getDocument(jobId);
      dispatch({
        type: "LOAD_OK",
        doc: loaded.document,
        updatedAt: loaded.updatedAt,
        speakerMapConfirmed: loaded.speakerMapConfirmed,
        pipelineState: loaded.pipelineState,
        audioSegments: loaded.audioSegments,
      });
      dispatch({
        type: "SET_CORRECTION_REPORT",
        report: buildCorrectionReport(loaded.document, null),
      });
    } catch (e) {
      dispatch({ type: "LOAD_ERR", error: String(e) });
    }
  }, [jobId]);

  const setActive = useCallback((id: UtteranceId | null) => {
    dispatch({ type: "SET_ACTIVE", id });
  }, []);

  const refreshMediaUrl = useCallback(async (segmentIndex = 0) => {
    const loaded = await workspaceApi.getDocument(jobId);
    const nextMediaUrl = loaded.audioSegments[segmentIndex]?.mediaUrl ?? loaded.document.media_url ?? "";
    dispatch({ type: "UPDATE_MEDIA_URL", mediaUrl: nextMediaUrl, segmentIndex });
    return nextMediaUrl;
  }, [jobId]);

  const editUtterance = useCallback(
    (utterance_id: UtteranceId, old_text: string, new_text: string) => {
      dispatch({
        type: "EDIT_UTTERANCE",
        utterance_id,
        word_id: null,
        old_text,
        new_text,
        source: "editor",
      });
    },
    []
  );

  const logSuggestionEdit = useCallback(
    (
      utterance_id: UtteranceId,
      word_id: string,
      old_text: string,
      new_text: string,
      source: "suggestion-accept" | "suggestion-edit",
      suggestion_id: string
    ) => {
      dispatch({
        type: "EDIT_UTTERANCE",
        utterance_id,
        word_id,
        old_text,
        new_text,
        source,
        suggestion_id,
      });
    },
    []
  );

  // Returns true on success (including the no-op case where there is nothing to
  // save), false when the save request errored. Callers that gate a follow-on
  // action on persisted corrections (e.g. the Format-and-Correct save→reload
  // sequence) must check this before proceeding — a failed save must never be
  // followed by a reload, which would discard the unsaved corrections.
  const saveNow = useCallback(async (): Promise<boolean> => {
    if (state.saving || !state.dirty || !state.document) return true;
    const changes = Object.entries(state.workingTexts).map(
      ([utterance_id, working_text]) => ({ utterance_id, working_text })
    );
    if (changes.length === 0) return true;
    const savedSeq = state.editSeq;
    dispatch({ type: "SAVE_START" });
    try {
      const result = await workspaceApi.saveWorking(jobId, { changes, source: "editor" }, {
        lastKnownUpdatedAt: state.jobUpdatedAt,
      });
      dispatch({ type: "SAVE_OK", savedSeq, updatedAt: result.updatedAt });
      return true;
    } catch (e) {
      dispatch({ type: "SAVE_ERR", error: String(e) });
      return false;
    }
  }, [jobId, state.dirty, state.document, state.editSeq, state.jobUpdatedAt, state.saving, state.workingTexts]);

  // Auto-save after 2 s of inactivity
  useEffect(() => {
    if (!state.dirty) return;
    if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
    pendingSaveRef.current = setTimeout(() => {
      void saveNow();
    }, 2000);
    return () => {
      if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
    };
  }, [state.dirty, state.workingTexts, saveNow]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!state.dirty && !state.saving) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [state.dirty, state.saving]);

  useEffect(() => {
    if (!state.document || state.speakersVersion === 0) {
      return;
    }

    dispatch({
      type: "SET_CORRECTION_REPORT",
      report: buildCorrectionReport(state.document, null),
    });
  }, [state.document, state.speakersVersion]);

  const updateSpeakers = useCallback((speakers: Speaker[]) => {
    dispatch({ type: "UPDATE_SPEAKERS", speakers });
  }, []);

  const setTranscriptVersion = useCallback((updatedAt: string | null) => {
    dispatch({ type: "SET_TRANSCRIPT_VERSION", updatedAt });
  }, []);

  const setSpeakerMapConfirmed = useCallback((confirmed: boolean, pipelineState?: string | null) => {
    dispatch({ type: "SET_SPEAKER_MAP_CONFIRMED", confirmed, pipelineState });
  }, []);

  const confirmStructure = useCallback(() => {
    dispatch({ type: "CONFIRM_STRUCTURE" });
  }, []);

  const keepRawLabels = useCallback(() => {
    dispatch({ type: "KEEP_RAW_LABELS" });
  }, []);

  const setRenderLayer = useCallback((layer: RenderLayer) => {
    dispatch({ type: "SET_RENDER_LAYER", layer });
  }, []);

  const markReviewed = useCallback((word_ids: string[]) => {
    dispatch({ type: "MARK_REVIEWED", word_ids });
  }, []);

  const markUnreviewed = useCallback((word_ids: string[]) => {
    dispatch({ type: "MARK_UNREVIEWED", word_ids });
  }, []);

  const getUtteranceText = useCallback(
    (utterance_id: UtteranceId): string => {
      if (state.workingTexts[utterance_id] !== undefined)
        return state.workingTexts[utterance_id];
      if (!state.document) return "";
      const utt = state.document.utterances.find(
        (u) => u.utterance_id === utterance_id
      );
      if (!utt) return "";
      return utt.word_ids
        .map((wid) => state.wordMap[wid]?.text ?? "")
        .join(" ");
    },
    [state.workingTexts, state.document, state.wordMap]
  );

  const value = useMemo<ContextValue>(
    () => ({
      state,
      loadDocument,
      refreshMediaUrl,
      setActive,
      editUtterance,
      logSuggestionEdit,
      saveNow,
      updateSpeakers,
      setTranscriptVersion,
      setSpeakerMapConfirmed,
      confirmStructure,
      keepRawLabels,
      setRenderLayer,
      markReviewed,
      markUnreviewed,
      getUtteranceText,
    }),
    [state, loadDocument, refreshMediaUrl, setActive, editUtterance, logSuggestionEdit, saveNow, updateSpeakers, setTranscriptVersion, setSpeakerMapConfirmed, confirmStructure, keepRawLabels, setRenderLayer, markReviewed, markUnreviewed, getUtteranceText]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDocument(): ContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDocument must be inside DocumentProvider");
  return ctx;
}



