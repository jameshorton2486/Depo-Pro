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
import {
  workspaceApi,
  type WorkspaceAudioSegment,
  type WorkspaceSegmentTarget,
} from "../api/workspaceService";

let _changeIdSeq = 0;
function nextChangeId(): string {
  return `chg_${Date.now()}_${++_changeIdSeq}`;
}

interface State {
  jobId: string;
  document: EditorDocument | null;
  loading: boolean;
  error: string | null;
  dirty: boolean;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: number | null;
  jobUpdatedAt: string | null;
  speakerMapConfirmed: boolean;
  audioSegments: WorkspaceAudioSegment[];
  segmentTargets: WorkspaceSegmentTarget[];
  currentSegmentIndex: number;
  currentTranscriptId: string | null;
  previousTranscriptId: string | null;
  nextTranscriptId: string | null;
  changeLog: ChangeLogEntry[];
  activeUtteranceId: UtteranceId | null;
  workingTexts: Record<UtteranceId, string>;
  wordMap: Record<string, Word>;
  editSeq: number;
}

type Action =
  | { type: "LOAD_START" }
  | {
      type: "LOAD_OK";
      doc: EditorDocument;
      updatedAt: string | null;
      speakerMapConfirmed: boolean;
      audioSegments: WorkspaceAudioSegment[];
      segmentTargets: WorkspaceSegmentTarget[];
      currentSegmentIndex: number;
      currentTranscriptId: string;
      previousTranscriptId: string | null;
      nextTranscriptId: string | null;
    }
  | { type: "LOAD_ERR"; error: string }
  | { type: "UPDATE_MEDIA_URL"; mediaUrl: string; segmentIndex: number }
  | { type: "SET_ACTIVE"; id: UtteranceId | null }
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
  | { type: "SET_SPEAKER_MAP_CONFIRMED"; confirmed: boolean }
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
        jobUpdatedAt: action.updatedAt,
        speakerMapConfirmed: action.speakerMapConfirmed,
        audioSegments: action.audioSegments,
        segmentTargets: action.segmentTargets,
        currentSegmentIndex: action.currentSegmentIndex,
        currentTranscriptId: action.currentTranscriptId,
        previousTranscriptId: action.previousTranscriptId,
        nextTranscriptId: action.nextTranscriptId,
      };

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
      };
    }

    case "SET_TRANSCRIPT_VERSION":
      return { ...state, jobUpdatedAt: action.updatedAt };

    case "SET_SPEAKER_MAP_CONFIRMED":
      return { ...state, speakerMapConfirmed: action.confirmed };

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
  navigateToPreviousSegment: () => Promise<void>;
  navigateToNextSegment: () => Promise<void>;
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
  saveNow: () => Promise<void>;
  updateSpeakers: (speakers: Speaker[]) => void;
  setTranscriptVersion: (updatedAt: string | null) => void;
  setSpeakerMapConfirmed: (confirmed: boolean) => void;
  markReviewed: (word_ids: string[]) => void;
  markUnreviewed: (word_ids: string[]) => void;
  getUtteranceText: (utterance_id: UtteranceId) => string;
}

const Ctx = createContext<ContextValue | null>(null);

export function createInitialDocumentState(jobId: string): State {
  return {
    jobId,
    document: null,
    loading: false,
    error: null,
    dirty: false,
    saving: false,
    saveError: null,
    lastSavedAt: null,
    jobUpdatedAt: null,
    speakerMapConfirmed: false,
    audioSegments: [],
    segmentTargets: [],
    currentSegmentIndex: 0,
    currentTranscriptId: null,
    previousTranscriptId: null,
    nextTranscriptId: null,
    changeLog: [],
    activeUtteranceId: null,
    workingTexts: {},
    wordMap: {},
    editSeq: 0,
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
  const selectedTranscriptIdRef = useRef<string | null>(null);

  const loadDocument = useCallback(async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const loaded = await workspaceApi.getDocument(selectedTranscriptIdRef.current ?? jobId);
      console.info("[DEPO-PRO] EditorDocument loaded:", loaded.document);
      selectedTranscriptIdRef.current = loaded.currentTranscriptId;
      dispatch({
        type: "LOAD_OK",
        doc: loaded.document,
        updatedAt: loaded.updatedAt,
        speakerMapConfirmed: loaded.speakerMapConfirmed,
        audioSegments: loaded.audioSegments,
        segmentTargets: loaded.segmentTargets,
        currentSegmentIndex: loaded.currentSegmentIndex,
        currentTranscriptId: loaded.currentTranscriptId,
        previousTranscriptId: loaded.previousTranscriptId,
        nextTranscriptId: loaded.nextTranscriptId,
      });
    } catch (e) {
      dispatch({ type: "LOAD_ERR", error: String(e) });
    }
  }, [jobId]);

  const setActive = useCallback((id: UtteranceId | null) => {
    dispatch({ type: "SET_ACTIVE", id });
  }, []);

  const refreshMediaUrl = useCallback(async (segmentIndex = 0) => {
    const loaded = await workspaceApi.getDocument(selectedTranscriptIdRef.current ?? jobId);
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

  const saveNow = useCallback(async () => {
    if (state.saving || !state.dirty || !state.document) return;
    const changes = Object.entries(state.workingTexts).map(
      ([utterance_id, working_text]) => ({ utterance_id, working_text })
    );
    if (changes.length === 0) return;
    const savedSeq = state.editSeq;
    dispatch({ type: "SAVE_START" });
    try {
      const result = await workspaceApi.saveWorking(selectedTranscriptIdRef.current ?? jobId, { changes, source: "editor" }, {
        lastKnownUpdatedAt: state.jobUpdatedAt,
      });
      dispatch({ type: "SAVE_OK", savedSeq, updatedAt: result.updatedAt });
    } catch (e) {
      dispatch({ type: "SAVE_ERR", error: String(e) });
      throw e;
    }
  }, [jobId, state.dirty, state.document, state.editSeq, state.jobUpdatedAt, state.saving, state.workingTexts]);

  const navigateToTranscript = useCallback(async (transcriptId: string | null) => {
    if (!transcriptId || transcriptId === selectedTranscriptIdRef.current) {
      return;
    }

    if (state.dirty) {
      await saveNow();
    }

    selectedTranscriptIdRef.current = transcriptId;
    dispatch({ type: "LOAD_START" });
    try {
      const loaded = await workspaceApi.getDocument(transcriptId);
      selectedTranscriptIdRef.current = loaded.currentTranscriptId;
      dispatch({
        type: "LOAD_OK",
        doc: loaded.document,
        updatedAt: loaded.updatedAt,
        speakerMapConfirmed: loaded.speakerMapConfirmed,
        audioSegments: loaded.audioSegments,
        segmentTargets: loaded.segmentTargets,
        currentSegmentIndex: loaded.currentSegmentIndex,
        currentTranscriptId: loaded.currentTranscriptId,
        previousTranscriptId: loaded.previousTranscriptId,
        nextTranscriptId: loaded.nextTranscriptId,
      });
    } catch (error) {
      dispatch({ type: "LOAD_ERR", error: String(error) });
      throw error;
    }
  }, [saveNow, state.dirty]);

  const navigateToPreviousSegment = useCallback(async () => {
    await navigateToTranscript(state.previousTranscriptId);
  }, [navigateToTranscript, state.previousTranscriptId]);

  const navigateToNextSegment = useCallback(async () => {
    await navigateToTranscript(state.nextTranscriptId);
  }, [navigateToTranscript, state.nextTranscriptId]);

  // Auto-save after 2 s of inactivity
  useEffect(() => {
    if (!state.dirty) return;
    if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
    pendingSaveRef.current = setTimeout(() => {
      void saveNow().catch(() => undefined);
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

  const updateSpeakers = useCallback((speakers: Speaker[]) => {
    dispatch({ type: "UPDATE_SPEAKERS", speakers });
  }, []);

  const setTranscriptVersion = useCallback((updatedAt: string | null) => {
    dispatch({ type: "SET_TRANSCRIPT_VERSION", updatedAt });
  }, []);

  const setSpeakerMapConfirmed = useCallback((confirmed: boolean) => {
    dispatch({ type: "SET_SPEAKER_MAP_CONFIRMED", confirmed });
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
      navigateToPreviousSegment,
      navigateToNextSegment,
      refreshMediaUrl,
      setActive,
      editUtterance,
      logSuggestionEdit,
      saveNow,
      updateSpeakers,
      setTranscriptVersion,
      setSpeakerMapConfirmed,
      markReviewed,
      markUnreviewed,
      getUtteranceText,
    }),
    [state, loadDocument, navigateToPreviousSegment, navigateToNextSegment, refreshMediaUrl, setActive, editUtterance, logSuggestionEdit, saveNow, updateSpeakers, setTranscriptVersion, setSpeakerMapConfirmed, markReviewed, markUnreviewed, getUtteranceText]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDocument(): ContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDocument must be inside DocumentProvider");
  return ctx;
}
