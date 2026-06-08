import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reactMocks = vi.hoisted(() => ({
  useReducerMock: vi.fn(),
  useCallbackMock: vi.fn((callback: unknown) => callback),
}));

const serviceMocks = vi.hoisted(() => ({
  listContactsMock: vi.fn(),
  searchContactsMock: vi.fn(),
  getContactMock: vi.fn(),
  createContactMock: vi.fn(),
  updateContactMock: vi.fn(),
  incrementUsageMock: vi.fn(),
  saveContactMock: vi.fn(),
  upsertDirectoryContactMock: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useReducer: reactMocks.useReducerMock,
    useCallback: reactMocks.useCallbackMock,
  };
});

vi.mock("../api/contactService", () => ({
  listContacts: (...args: unknown[]) => serviceMocks.listContactsMock(...args),
  searchContacts: (...args: unknown[]) => serviceMocks.searchContactsMock(...args),
  getContact: (...args: unknown[]) => serviceMocks.getContactMock(...args),
  createContact: (...args: unknown[]) => serviceMocks.createContactMock(...args),
  updateContact: (...args: unknown[]) => serviceMocks.updateContactMock(...args),
  incrementUsage: (...args: unknown[]) => serviceMocks.incrementUsageMock(...args),
  saveContact: (...args: unknown[]) => serviceMocks.saveContactMock(...args),
  upsertDirectoryContact: (...args: unknown[]) => serviceMocks.upsertDirectoryContactMock(...args),
}));

import type { Contact, ContactInsert, ContactUpdate } from "../types/contact";
import { useContactStore } from "./contactStore";

const contactOne: Contact = {
  id: "contact_1",
  type: "attorney",
  name: "Karen M. Alvarado",
  organization: "Brothers Law",
  phone: "2105550101",
  email: "karen@example.com",
  address: "123 Main",
  times_used: 2,
  notes: "",
  firm_id: "firm_1",
  details: {
    kind: "attorney",
    bar_number: "24012345",
    direct_phone: "2105550101",
    extension: null,
    fax: null,
    assistant_name: null,
    assistant_email: null,
    preferred_appearance_label: null,
  },
  created_at: "2026-06-08T00:00:00.000Z",
  updated_at: "2026-06-08T00:00:00.000Z",
};

const contactTwo: Contact = {
  ...contactOne,
  id: "contact_2",
  name: "Curtis L. Cukjati",
  times_used: 5,
};

function createStoreHarness() {
  let state = {
    contacts: [] as Contact[],
    loading: false,
    error: null as string | null,
  };

  reactMocks.useReducerMock.mockImplementation((reducer: typeof Function) => {
    const dispatch = (action: unknown) => {
      state = reducer(state, action);
    };

    return [state, dispatch];
  });

  return {
    render() {
      return useContactStore();
    },
  };
}

describe("useContactStore", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    reactMocks.useReducerMock.mockReset();
    reactMocks.useCallbackMock.mockClear();
    serviceMocks.listContactsMock.mockReset();
    serviceMocks.searchContactsMock.mockReset();
    serviceMocks.getContactMock.mockReset();
    serviceMocks.createContactMock.mockReset();
    serviceMocks.updateContactMock.mockReset();
    serviceMocks.incrementUsageMock.mockReset();
    serviceMocks.saveContactMock.mockReset();
    serviceMocks.upsertDirectoryContactMock.mockReset();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("loads contacts through the current success path and clears loading on fetch success", async () => {
    serviceMocks.listContactsMock.mockResolvedValue([contactOne]);
    const harness = createStoreHarness();
    const store = harness.render();

    await store.load("attorney");

    const next = harness.render();
    expect(serviceMocks.listContactsMock).toHaveBeenCalledWith("attorney");
    expect(next.loading).toBe(false);
    expect(next.error).toBeNull();
    expect(next.contacts).toEqual([contactOne]);
  });

  it("searches contacts through the current success path and replaces the contact list", async () => {
    serviceMocks.searchContactsMock.mockResolvedValue([contactTwo]);
    const harness = createStoreHarness();
    const store = harness.render();

    await store.search("cukjati", "attorney");

    const next = harness.render();
    expect(serviceMocks.searchContactsMock).toHaveBeenCalledWith("cukjati", "attorney");
    expect(next.contacts).toEqual([contactTwo]);
    expect(next.loading).toBe(false);
    expect(next.error).toBeNull();
  });

  it("records the current load error behavior by setting error and retaining prior contacts", async () => {
    serviceMocks.listContactsMock.mockResolvedValueOnce([contactOne]);
    serviceMocks.listContactsMock.mockRejectedValueOnce(new Error("contacts unavailable"));
    const harness = createStoreHarness();
    const store = harness.render();

    await store.load();
    await store.load("attorney");

    const next = harness.render();
    expect(next.contacts).toEqual([contactOne]);
    expect(next.loading).toBe(false);
    expect(next.error).toBe("Error: contacts unavailable");
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it("upserts through create/update/save by appending new ids and replacing existing ids", async () => {
    const created = { ...contactOne, id: "contact_3", name: "Dana Ruiz" };
    const updated = { ...created, organization: "Updated Firm" };
    const savedExisting = { ...updated, phone: "2105558888" };
    serviceMocks.createContactMock.mockResolvedValue(created);
    serviceMocks.updateContactMock.mockResolvedValue(updated);
    serviceMocks.saveContactMock.mockResolvedValue(savedExisting);
    const harness = createStoreHarness();
    const store = harness.render();

    await store.create({
      type: "attorney",
      name: created.name,
      organization: created.organization,
      phone: created.phone,
      email: created.email,
      address: created.address,
      notes: created.notes,
    } satisfies ContactInsert);

    expect(harness.render().contacts).toEqual([created]);

    await store.update(created.id, {
      organization: updated.organization,
    } satisfies ContactUpdate);

    expect(harness.render().contacts).toEqual([updated]);

    await store.save({
      id: updated.id,
      type: updated.type,
      name: updated.name,
      organization: updated.organization,
      phone: savedExisting.phone,
      email: updated.email,
      address: updated.address,
      notes: updated.notes,
    });

    expect(harness.render().contacts).toEqual([savedExisting]);
  });

  it("increments usage after the service side effect resolves", async () => {
    serviceMocks.createContactMock.mockResolvedValue(contactOne);
    serviceMocks.incrementUsageMock.mockResolvedValue(undefined);
    const harness = createStoreHarness();
    const store = harness.render();

    await store.create({
      type: "attorney",
      name: contactOne.name,
      organization: contactOne.organization,
      phone: contactOne.phone,
      email: contactOne.email,
      address: contactOne.address,
      notes: contactOne.notes,
      firm_id: contactOne.firm_id,
      details: contactOne.details,
    });
    await store.useContact(contactOne.id);

    const next = harness.render();
    expect(serviceMocks.incrementUsageMock).toHaveBeenCalledWith(contactOne.id);
    expect(next.contacts[0]?.times_used).toBe(contactOne.times_used + 1);
  });
});
