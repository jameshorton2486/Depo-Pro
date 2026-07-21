// Keyterm store — React context + pure reducer.
// All state mutations go through dispatch; components never mutate directly.
// Pruning runs automatically after any selection change.

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import type { ManagedKeyterm, KeytermView, AddKeytermForm } from "./types";
import { rankKeyterms, countTokens, totalTokens, selectedCount } from "../../lib/keytermRanker";
import { pruneToLimits, checkLimits, type LimitStatus } from "../../lib/keytermPruner";
import type { HarvestedKeyterm } from "../../lib/keyterms/harvestKeyterms";
import { mergeManagedKeytermSuggestions } from "../../lib/keyterms/managedKeyterms";
import { formatDeepgramKeyterm } from "../../lib/format/legalText";

// ─── State ────────────────────────────────────────────────────────────────────

export interface KeytermState {
  terms: ManagedKeyterm[];
  view: KeytermView;
  search: string;
  lastPruned: string[];
  showPayload: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "ADD";           payload: AddKeytermForm }
  | { type: "DELETE";        payload: { id: string } }
  | { type: "TOGGLE_SELECT"; payload: { id: string } }
  | { type: "TOGGLE_PIN";    payload: { id: string } }
  | { type: "SET_BOOST";     payload: { id: string; boost: number } }
  | { type: "SET_VIEW";      payload: { view: KeytermView } }
  | { type: "SET_SEARCH";    payload: { search: string } }
  | { type: "LOAD";          payload: { terms: ManagedKeyterm[] } }
  | { type: "MERGE_SUGGESTIONS"; payload: { suggestions: HarvestedKeyterm[] } }
  | { type: "PRUNE" }
  | { type: "TOGGLE_PAYLOAD" };

// ─── ID generator ─────────────────────────────────────────────────────────────

function newId(): string {
  return `kt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function rerank(terms: ManagedKeyterm[]): ManagedKeyterm[] {
  return rankKeyterms(terms);
}

function keytermReducer(state: KeytermState, action: Action): KeytermState {
  switch (action.type) {

    case "ADD": {
      const f = action.payload;
      const trimmed = formatDeepgramKeyterm(f.term);
      if (!trimmed) return state;

      const exists = state.terms.some(
        (t) => t.term.toLowerCase() === trimmed.toLowerCase(),
      );
      if (exists) return state;

      const term: ManagedKeyterm = {
        id:          newId(),
        term:        trimmed,
        boost:       Math.max(0, Math.min(1, f.boost)),
        category:    f.category,
        source:      f.source,
        notes:       f.notes,
        selected:    true,
        pinned:      false,
        priority:    0,
        confidence:  f.source === "Manual" ? 1.0 : 0.8,
        token_count: countTokens(trimmed),
      };
      const ranked = rerank([...state.terms, term]);
      const { terms: pruned, deselected } = pruneToLimits(ranked);
      return { ...state, terms: pruned, lastPruned: deselected };
    }

    case "DELETE": {
      const terms = rerank(state.terms.filter((t) => t.id !== action.payload.id));
      return { ...state, terms, lastPruned: [] };
    }

    case "TOGGLE_SELECT": {
      const { id } = action.payload;
      const mapped = state.terms.map((t) =>
        t.id === id ? { ...t, selected: !t.selected } : t,
      );
      const ranked = rerank(mapped);
      const { terms: pruned, deselected } = pruneToLimits(ranked);
      return { ...state, terms: pruned, lastPruned: deselected };
    }

    case "TOGGLE_PIN": {
      const { id } = action.payload;
      const mapped = state.terms.map((t) =>
        t.id === id
          ? { ...t, pinned: !t.pinned, selected: !t.pinned ? true : t.selected }
          : t,
      );
      const ranked = rerank(mapped);
      const { terms: pruned, deselected } = pruneToLimits(ranked);
      return { ...state, terms: pruned, lastPruned: deselected };
    }

    case "SET_BOOST": {
      const { id, boost } = action.payload;
      const clamped = Math.max(0, Math.min(1, boost));
      const mapped = state.terms.map((t) =>
        t.id === id ? { ...t, boost: clamped } : t,
      );
      return { ...state, terms: rerank(mapped) };
    }

    case "SET_VIEW":
      return { ...state, view: action.payload.view };

    case "SET_SEARCH":
      return { ...state, search: action.payload.search };

    case "LOAD": {
      const ranked = rerank(action.payload.terms);
      const { terms: pruned } = pruneToLimits(ranked);
      return { ...state, terms: pruned, lastPruned: [] };
    }

    case "MERGE_SUGGESTIONS": {
      const merged = mergeManagedKeytermSuggestions(state.terms, action.payload.suggestions);
      const ranked = rerank(merged);
      const { terms: pruned } = pruneToLimits(ranked);
      return { ...state, terms: pruned, lastPruned: [] };
    }

    case "PRUNE": {
      const ranked = rerank(state.terms);
      const { terms: pruned, deselected } = pruneToLimits(ranked);
      return { ...state, terms: pruned, lastPruned: deselected };
    }

    case "TOGGLE_PAYLOAD":
      return { ...state, showPayload: !state.showPayload };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface KeytermContextValue {
  state: KeytermState;
  limits: LimitStatus;
  addTerm: (form: AddKeytermForm) => void;
  deleteTerm: (id: string) => void;
  toggleSelect: (id: string) => void;
  togglePin: (id: string) => void;
  setBoost: (id: string, boost: number) => void;
  setView: (view: KeytermView) => void;
  setSearch: (s: string) => void;
  load: (terms: ManagedKeyterm[]) => void;
  mergeSuggestions: (suggestions: HarvestedKeyterm[]) => void;
  prune: () => void;
  togglePayload: () => void;
  visibleTerms: ManagedKeyterm[];
}

const KeytermContext = createContext<KeytermContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function KeytermProvider({
  children,
  initialTerms = [],
}: {
  children: ReactNode;
  initialTerms?: ManagedKeyterm[];
}) {
  const initial: KeytermState = {
    terms:       rankKeyterms(initialTerms),
    view:        "all",
    search:      "",
    lastPruned:  [],
    showPayload: false,
  };

  const [state, dispatch] = useReducer(keytermReducer, initial);

  const limits = checkLimits(state.terms);

  const addTerm      = useCallback((form: AddKeytermForm) => dispatch({ type: "ADD", payload: form }), []);
  const deleteTerm   = useCallback((id: string) => dispatch({ type: "DELETE", payload: { id } }), []);
  const toggleSelect = useCallback((id: string) => dispatch({ type: "TOGGLE_SELECT", payload: { id } }), []);
  const togglePin    = useCallback((id: string) => dispatch({ type: "TOGGLE_PIN", payload: { id } }), []);
  const setBoost     = useCallback((id: string, boost: number) => dispatch({ type: "SET_BOOST", payload: { id, boost } }), []);
  const setView      = useCallback((view: KeytermView) => dispatch({ type: "SET_VIEW", payload: { view } }), []);
  const setSearch    = useCallback((search: string) => dispatch({ type: "SET_SEARCH", payload: { search } }), []);
  const load         = useCallback((terms: ManagedKeyterm[]) => dispatch({ type: "LOAD", payload: { terms } }), []);
  const mergeSuggestions = useCallback((suggestions: HarvestedKeyterm[]) => {
    dispatch({ type: "MERGE_SUGGESTIONS", payload: { suggestions } });
  }, []);
  const prune        = useCallback(() => dispatch({ type: "PRUNE" }), []);
  const togglePayload = useCallback(() => dispatch({ type: "TOGGLE_PAYLOAD" }), []);

  const visibleTerms = state.terms.filter((t) => {
    const matchesView =
      state.view === "all"      ? true :
      state.view === "selected" ? t.selected :
      state.view === "pinned"   ? t.pinned :
      state.view === "excluded" ? !t.selected : true;

    const q = state.search.toLowerCase();
    const matchesSearch =
      !q ||
      t.term.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.source.toLowerCase().includes(q);

    return matchesView && matchesSearch;
  });

  // Suppress unused-import warning — these are used by consumers via re-export
  void totalTokens;
  void selectedCount;

  return (
    <KeytermContext.Provider value={{
      state, limits, addTerm, deleteTerm, toggleSelect, togglePin,
      setBoost, setView, setSearch, load, mergeSuggestions, prune, togglePayload, visibleTerms,
    }}>
      {children}
    </KeytermContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useKeyterms(): KeytermContextValue {
  const ctx = useContext(KeytermContext);
  if (!ctx) throw new Error("useKeyterms must be used inside <KeytermProvider>");
  return ctx;
}
