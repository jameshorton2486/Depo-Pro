import { useCallback, useReducer } from "react";
import type { Contact, ContactInsert, ContactUpdate, ContactType } from "../types/contact";
import {
  listContacts,
  searchContacts,
  getContact,
  createContact,
  updateContact,
  incrementUsage,
  saveContact,
  upsertDirectoryContact,
  type DirectoryContactUpsertResult,
} from "../api/contactService";

// ─── State ────────────────────────────────────────────────────────────────────

export interface ContactState {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
}

const initialState: ContactState = {
  contacts: [],
  loading: false,
  error: null,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type ContactAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: Contact[] }
  | { type: "FETCH_ERROR"; payload: string }
  | { type: "UPSERT"; payload: Contact }
  | { type: "INCREMENT_USAGE"; payload: string };

function contactReducer(state: ContactState, action: ContactAction): ContactState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };

    case "FETCH_SUCCESS":
      return { ...state, loading: false, contacts: action.payload };

    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };

    case "UPSERT": {
      const exists = state.contacts.some((c) => c.id === action.payload.id);
      const contacts = exists
        ? state.contacts.map((c) => (c.id === action.payload.id ? action.payload : c))
        : [...state.contacts, action.payload];
      return { ...state, contacts };
    }

    case "INCREMENT_USAGE":
      return {
        ...state,
        contacts: state.contacts.map((c) =>
          c.id === action.payload ? { ...c, times_used: c.times_used + 1 } : c
        ),
      };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useContactStore() {
  const [state, dispatch] = useReducer(contactReducer, initialState);

  const load = useCallback(async (type?: ContactType) => {
    dispatch({ type: "FETCH_START" });
    try {
      const contacts = await listContacts(type);
      dispatch({ type: "FETCH_SUCCESS", payload: contacts });
    } catch (err) {
      console.error("[DEPO-PRO] Supabase contacts load failed", {
        operation: "listContacts",
        table: "contacts",
        message: err instanceof Error ? err.message : String(err),
      });
      dispatch({ type: "FETCH_ERROR", payload: String(err) });
    }
  }, []);

  const search = useCallback(async (term: string, type?: ContactType) => {
    dispatch({ type: "FETCH_START" });
    try {
      const contacts = await searchContacts(term, type);
      dispatch({ type: "FETCH_SUCCESS", payload: contacts });
    } catch (err) {
      console.error("[DEPO-PRO] Supabase contacts search failed", {
        operation: "searchContacts",
        table: "contacts",
      });
      dispatch({ type: "FETCH_ERROR", payload: String(err) });
    }
  }, []);

  const fetchOne = useCallback(async (id: string): Promise<Contact | null> => {
    try {
      return await getContact(id);
    } catch {
      return null;
    }
  }, []);

  const create = useCallback(async (payload: ContactInsert): Promise<Contact> => {
    const contact = await createContact(payload);
    dispatch({ type: "UPSERT", payload: contact });
    return contact;
  }, []);

  const update = useCallback(async (id: string, patch: ContactUpdate): Promise<Contact> => {
    const contact = await updateContact(id, patch);
    dispatch({ type: "UPSERT", payload: contact });
    return contact;
  }, []);

  const save = useCallback(
    async (payload: ContactInsert & { id?: string }): Promise<Contact> => {
      const contact = await saveContact(payload);
      dispatch({ type: "UPSERT", payload: contact });
      return contact;
    },
    []
  );

  const useContact = useCallback(async (id: string): Promise<void> => {
    await incrementUsage(id);
    dispatch({ type: "INCREMENT_USAGE", payload: id });
  }, []);

  const upsertDirectory = useCallback(async (payload: ContactInsert): Promise<DirectoryContactUpsertResult> => {
    const result = await upsertDirectoryContact(payload);
    dispatch({ type: "UPSERT", payload: result.contact });
    return result;
  }, []);

  return {
    ...state,
    load,
    search,
    fetchOne,
    create,
    update,
    save,
    upsertDirectory,
    useContact,
  };
}

// ─── Re-export service layer for direct use outside of React ──────────────────
export { listContacts, searchContacts, getContact, createContact, updateContact, incrementUsage, saveContact, upsertDirectoryContact };
export type { Contact, ContactInsert, ContactUpdate, ContactType };
