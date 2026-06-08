import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hookRuntime = vi.hoisted(() => ({
  slots: [] as unknown[],
  effects: [] as Array<() => void | Promise<void>>,
  index: 0,
}));

const useIntakeMock = vi.hoisted(() => vi.fn());
const useContactStoreMock = vi.hoisted(() => vi.fn());
const getMyProfileMock = vi.hoisted(() => vi.fn());
const getFirmMock = vi.hoisted(() => vi.fn());
const searchFirmsMock = vi.hoisted(() => vi.fn());
const upsertFirmMock = vi.hoisted(() => vi.fn());

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();

  function useState<T>(initial: T) {
    const slot = hookRuntime.index++;
    if (!(slot in hookRuntime.slots)) {
      hookRuntime.slots[slot] = initial;
    }
    const setState = (next: T | ((current: T) => T)) => {
      const current = hookRuntime.slots[slot] as T;
      hookRuntime.slots[slot] = typeof next === "function"
        ? (next as (current: T) => T)(current)
        : next;
    };
    return [hookRuntime.slots[slot] as T, setState] as const;
  }

  function useEffect(effect: () => void | Promise<void>) {
    hookRuntime.effects.push(effect);
  }

  return {
    ...actual,
    useState,
    useEffect,
    useMemo: <T,>(factory: () => T) => factory(),
  };
});

vi.mock("../../context/useIntake", () => ({
  useIntake: (...args: unknown[]) => useIntakeMock(...args),
}));

vi.mock("../../store/contactStore", () => ({
  useContactStore: (...args: unknown[]) => useContactStoreMock(...args),
}));

vi.mock("../../api/reporterProfileService", () => ({
  getMyProfile: (...args: unknown[]) => getMyProfileMock(...args),
}));

vi.mock("../../api/firmService", () => ({
  getFirm: (...args: unknown[]) => getFirmMock(...args),
  searchFirms: (...args: unknown[]) => searchFirmsMock(...args),
  upsertFirm: (...args: unknown[]) => upsertFirmMock(...args),
}));

import { emptyCaseRecord } from "../../types/case";
import { ParticipantsPanel } from "./ParticipantsPanel";
import type { Contact } from "../../types/contact";

type ElementOfType<T extends string> = ReactElement<Record<string, unknown>, T>;

function renderFunctionElement(element: ReactElement) {
  return (element.type as (props: Record<string, unknown>) => ReactNode)(element.props as Record<string, unknown>);
}

function defaultDraft() {
  return {
    name: "",
    organization: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    firmQuery: "",
    firmName: "",
    firmAddress: "",
    firmCity: "",
    firmState: "",
    firmZip: "",
    firmMainPhone: "",
    firmFax: "",
    attorneyBarNumber: "",
    attorneyExtension: "",
    attorneyFax: "",
    attorneyAssistantName: "",
    attorneyAssistantEmail: "",
    attorneyAppearanceLabel: "",
    attorneyRepresentingPreset: "plaintiff",
    attorneyRepresentingParty: "",
    attorneyFunction: "OTHER",
    attorneyTimeUsed: "",
    interpreterCertified: false,
    interpreterCertNumber: "",
    interpreterCertificationAuthority: "",
    interpreterCertificationExpiration: "",
    interpreterRemoteCapable: false,
    interpreterAgency: "",
    interpreterAgencyContact: "",
    interpreterDefaultLanguages: "",
    interpreterOathAdministered: "unknown",
    interpreterLanguageFrom: "",
    interpreterLanguageTo: "",
    videographerCertNumber: "",
    videographerRoleTitle: "",
    genericRoleInProceeding: "",
    reporterCsrNumber: "",
    reporterCsrExpiration: "",
    reporterFirmRegistration: "",
  };
}

function seedPanelState(partial: Partial<Record<number, unknown>>) {
  hookRuntime.slots = [];
  hookRuntime.effects = [];
  hookRuntime.index = 0;
  hookRuntime.slots[0] = partial[0] ?? null; // drawerCategory
  hookRuntime.slots[1] = partial[1] ?? "pick"; // drawerMode
  hookRuntime.slots[2] = partial[2] ?? ""; // contactQuery
  hookRuntime.slots[3] = partial[3] ?? []; // firmResults
  hookRuntime.slots[4] = partial[4] ?? null; // selectedContact
  hookRuntime.slots[5] = partial[5] ?? null; // selectedFirm
  hookRuntime.slots[6] = partial[6] ?? defaultDraft(); // draft
  hookRuntime.slots[7] = partial[7] ?? false; // profilePending
  hookRuntime.slots[8] = partial[8] ?? null; // error
  hookRuntime.slots[9] = partial[9] ?? false; // saving
}

function renderPanel() {
  hookRuntime.index = 0;
  hookRuntime.effects = [];
  return ParticipantsPanel();
}

async function runEffects() {
  for (const effect of hookRuntime.effects) {
    await effect();
  }
}

function walk(node: ReactNode, visit: (element: ReactElement) => void) {
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit));
    return;
  }
  if (!isValidElement(node)) {
    return;
  }
  if (typeof node.type === "function") {
    walk(renderFunctionElement(node), visit);
    return;
  }
  visit(node);
  walk(node.props.children, visit);
}

function textContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((child) => textContent(child)).join("");
  }
  if (!isValidElement(node)) {
    return "";
  }
  if (typeof node.type === "function") {
    return textContent(renderFunctionElement(node));
  }
  return textContent(node.props.children);
}

function findButton(tree: ReactNode, label: string): ElementOfType<"button"> {
  let match: ElementOfType<"button"> | null = null;
  walk(tree, (element) => {
    if (element.type === "button" && textContent(element.props.children).includes(label)) {
      match = element as ElementOfType<"button">;
    }
  });
  if (!match) {
    throw new Error(`Button not found: ${label}`);
  }
  return match as ElementOfType<"button">;
}

function findLabel(tree: ReactNode, label: string) {
  let match: ReactElement | null = null;
  walk(tree, (element) => {
    if (element.type === "label" && textContent(element.props.children).includes(label)) {
      match = element;
    }
  });
  if (!match) {
    throw new Error(`Label not found: ${label}`);
  }
  return match;
}

function expectText(tree: ReactNode, value: string) {
  const haystack = textContent(tree);
  expect(haystack).toContain(value);
}

describe("ParticipantsPanel", () => {
  const record = emptyCaseRecord("case_participants", "2026-06-08T00:00:00.000Z");
  const updateField = vi.fn();
  const addAttorney = vi.fn();
  const removeAttorney = vi.fn();
  const addInterpreter = vi.fn();
  const removeInterpreter = vi.fn();
  const addVideographer = vi.fn();
  const removeVideographer = vi.fn();
  const addParticipant = vi.fn();
  const removeParticipant = vi.fn();
  const search = vi.fn();
  const upsertDirectory = vi.fn();
  const useContact = vi.fn();

  const attorneyContact: Contact = {
    id: "contact_attorney_1",
    type: "attorney",
    name: "Karen M. Alvarado",
    organization: "",
    phone: "2105550101",
    email: "karen@example.com",
    address: "123 Main",
    times_used: 5,
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
      preferred_appearance_label: "MS. ALVARADO",
    },
    created_at: "2026-06-08T00:00:00.000Z",
    updated_at: "2026-06-08T00:00:00.000Z",
  };

  beforeEach(() => {
    seedPanelState({});
    updateField.mockReset();
    addAttorney.mockReset();
    removeAttorney.mockReset();
    addInterpreter.mockReset();
    removeInterpreter.mockReset();
    addVideographer.mockReset();
    removeVideographer.mockReset();
    addParticipant.mockReset();
    removeParticipant.mockReset();
    search.mockReset();
    upsertDirectory.mockReset();
    useContact.mockReset();
    getMyProfileMock.mockReset();
    getFirmMock.mockReset();
    searchFirmsMock.mockReset();
    upsertFirmMock.mockReset();

    useIntakeMock.mockReturnValue({
      record,
      addAttorney,
      removeAttorney,
      addInterpreter,
      removeInterpreter,
      addVideographer,
      removeVideographer,
      addParticipant,
      removeParticipant,
      updateField,
    });
    useContactStoreMock.mockReturnValue({
      contacts: [attorneyContact],
      search,
      upsertDirectory,
      useContact,
    });
    getFirmMock.mockResolvedValue({
      id: "firm_1",
      name: "Brothers, Alvarado, Piazza & Cozort, P.C.",
      address: "123 Main",
      city: "San Antonio",
      state: "TX",
      zip: "78205",
      main_phone: "2105550202",
      fax: "2105550203",
      created_at: "2026-06-08T00:00:00.000Z",
      updated_at: "2026-06-08T00:00:00.000Z",
      owner_user_id: "user_1",
    });
    searchFirmsMock.mockResolvedValue([]);
    upsertFirmMock.mockResolvedValue({
      conflicts: [],
      created: false,
      firm: {
        id: "firm_1",
        name: "Brothers, Alvarado, Piazza & Cozort, P.C.",
        address: "123 Main",
        city: "San Antonio",
        state: "TX",
        zip: "78205",
        main_phone: "2105550202",
        fax: "2105550203",
        created_at: "2026-06-08T00:00:00.000Z",
        updated_at: "2026-06-08T00:00:00.000Z",
        owner_user_id: "user_1",
      },
    });
  });

  it("renders category-specific drawer fields for attorney, reporter, interpreter, videographer, and generic participants", () => {
    seedPanelState({ 0: "attorney", 1: "create" });
    let tree = renderPanel();
    expect(findLabel(tree, "Attorney Name")).toBeTruthy();
    expect(findLabel(tree, "SBOT / Bar Number")).toBeTruthy();
    expect(findLabel(tree, "Specific Party")).toBeTruthy();

    seedPanelState({ 0: "reporter", 1: "create" });
    tree = renderPanel();
    expect(findLabel(tree, "Reporter Name")).toBeTruthy();
    expect(findLabel(tree, "CSR Number")).toBeTruthy();

    seedPanelState({ 0: "interpreter", 1: "create" });
    tree = renderPanel();
    expect(findLabel(tree, "Interpreter Name")).toBeTruthy();
    expect(findLabel(tree, "Language To")).toBeTruthy();

    seedPanelState({ 0: "videographer", 1: "create" });
    tree = renderPanel();
    expect(findLabel(tree, "Videographer Name")).toBeTruthy();
    expect(findLabel(tree, "Role Title")).toBeTruthy();

    seedPanelState({ 0: "corporate_representative", 1: "create" });
    tree = renderPanel();
    expect(findLabel(tree, "Role In This Proceeding")).toBeTruthy();
  });

  it("renders a long attorney name as a single intact text string in the participant card", () => {
    const attorneyRecord = emptyCaseRecord("case_participants_long_name", "2026-06-08T00:00:00.000Z");
    attorneyRecord.attorneys = [{
      attorney_id: "attorney_long_1",
      name: { value: "Brothers Alvarado Piazza Cozort Counsel", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      firm: { value: "Brothers Law", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      function: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      representing: { value: "FOR THE DEFENDANT", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      bar_number: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      address: null,
      city: null,
      state: null,
      zip: null,
      time_used: null,
      email: null,
      phone: null,
    }];

    useIntakeMock.mockReturnValue({
      record: attorneyRecord,
      addAttorney,
      removeAttorney,
      addInterpreter,
      removeInterpreter,
      addVideographer,
      removeVideographer,
      addParticipant,
      removeParticipant,
      updateField,
    });

    const tree = renderPanel();
    expectText(tree, "Brothers Alvarado Piazza Cozort Counsel");
  });

  it("applies the signed-in reporter profile through the current Use My Reporter Profile path", async () => {
    getMyProfileMock.mockResolvedValue({
      display_name: "Miah Lopez",
      csr_number: "CSR-77",
      csr_cert_expiration: "2027-01-01",
      firm_registration_number: "FIRM-9",
    });
    const tree = renderPanel();

    (findButton(tree, "Use My Reporter Profile").props as { onClick?: () => unknown }).onClick?.();
    await Promise.resolve();

    expect(updateField.mock.calls).toEqual([
      ["reporter.name", "Miah Lopez", "imported", null, true],
      ["reporter.cert_number", "CSR-77", "imported", null, true],
      ["reporter.license_expiration", "2027-01-01", "imported", null, true],
      ["reporter.firm_registration_number", "FIRM-9", "imported", null, true],
    ]);
  });

  it("keeps the picked attorney in pick mode and resolves the linked firm banner through firm_id", async () => {
    seedPanelState({ 0: "attorney", 1: "pick" });
    let tree = renderPanel();

    (findButton(tree, "Karen M. Alvarado").props as { onClick?: () => unknown }).onClick?.();
    tree = renderPanel();
    await runEffects();
    tree = renderPanel();

    expect(getFirmMock).toHaveBeenCalledWith("firm_1");
    expectText(tree, "Brothers, Alvarado, Piazza & Cozort, P.C.");
  });

  it("maps attorney details.direct_phone into the draft phone and preserves already-typed overrides on pick", () => {
    const draft = defaultDraft();
    draft.email = "custom@example.com";
    draft.attorneyBarNumber = "24077777";
    const contactWithDifferentNumbers: Contact = {
      ...attorneyContact,
      phone: "9998887777",
      details: {
        direct_phone: "2105551212",
        kind: "attorney",
        bar_number: attorneyContact.details.kind === "attorney" ? attorneyContact.details.bar_number : null,
        extension: attorneyContact.details.kind === "attorney" ? attorneyContact.details.extension : null,
        fax: attorneyContact.details.kind === "attorney" ? attorneyContact.details.fax : null,
        assistant_name: attorneyContact.details.kind === "attorney" ? attorneyContact.details.assistant_name : null,
        assistant_email: attorneyContact.details.kind === "attorney" ? attorneyContact.details.assistant_email : null,
        preferred_appearance_label: attorneyContact.details.kind === "attorney" ? attorneyContact.details.preferred_appearance_label : null,
      },
    };

    useContactStoreMock.mockReturnValue({
      contacts: [contactWithDifferentNumbers],
      search,
      upsertDirectory,
      useContact,
    });

    seedPanelState({ 0: "attorney", 1: "pick", 6: draft });
    const tree = renderPanel();

    (findButton(tree, "Karen M. Alvarado").props as { onClick?: () => unknown }).onClick?.();

    expect(hookRuntime.slots[6]).toMatchObject({
      name: "Karen M. Alvarado",
      phone: "2105551212",
      email: "custom@example.com",
      attorneyBarNumber: "24077777",
      attorneyAppearanceLabel: "MS. ALVARADO",
    });
  });

  it("adds a picked attorney using the draft values, linked firm, and current usage increment path", async () => {
    const draft = defaultDraft();
    draft.phone = "2105557878";
    draft.email = "custom@example.com";
    draft.attorneyBarNumber = "24077777";
    draft.attorneyFunction = "EXAMINING";
    draft.attorneyRepresentingPreset = "defendant";
    draft.attorneyRepresentingParty = "Home Depot";
    seedPanelState({ 0: "attorney", 1: "pick", 6: draft });

    let tree = renderPanel();
    (findButton(tree, "Karen M. Alvarado").props as { onClick?: () => unknown }).onClick?.();
    tree = renderPanel();
    await runEffects();
    tree = renderPanel();

    (findButton(tree, "Add Attorney").props as { onClick?: () => unknown }).onClick?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(useContact).toHaveBeenCalledWith("contact_attorney_1");
    expect(addAttorney).toHaveBeenCalledWith({
      name: { value: "Karen M. Alvarado", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      firm: { value: "Brothers, Alvarado, Piazza & Cozort, P.C.", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      function: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      representing: { value: "FOR DEFENDANT HOME DEPOT", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      bar_number: { value: "24077777", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      address: "123 Main",
      city: "San Antonio",
      state: "TX",
      zip: "78205",
      time_used: null,
      email: "custom@example.com",
      phone: "2105557878",
    });
  });

  it("persists generic participant role_in_this_proceeding through the current add flow", async () => {
    const draft = defaultDraft();
    draft.name = "Jordan Smith";
    draft.organization = "Home Depot";
    draft.genericRoleInProceeding = "Corporate representative";
    upsertDirectory.mockResolvedValue({
      created: true,
      conflicts: [],
      contact: {
        id: "contact_generic_1",
        type: "corporate_representative",
        name: "Jordan Smith",
        organization: "Home Depot",
        phone: "",
        email: "jordan@example.com",
        address: "",
        times_used: 0,
        notes: "",
        firm_id: null,
        details: { kind: "corporate_representative" },
        created_at: "2026-06-08T00:00:00.000Z",
        updated_at: "2026-06-08T00:00:00.000Z",
      },
    });
    seedPanelState({ 0: "corporate_representative", 1: "create", 6: draft });
    const tree = renderPanel();

    (findButton(tree, "Add Corporate Representative").props as { onClick?: () => unknown }).onClick?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(addParticipant).toHaveBeenCalledWith({
      name: { value: "Jordan Smith", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: "OTHER",
      organization: "Home Depot",
      email: "jordan@example.com",
      phone: null,
      role_in_this_proceeding: "Corporate representative",
      notes: null,
    });
  });
});
