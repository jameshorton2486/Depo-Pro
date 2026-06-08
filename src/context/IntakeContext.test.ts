import type { ReactElement } from "react";
import { isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reactMocks = vi.hoisted(() => ({
  useReducerMock: vi.fn(),
  useCallbackMock: vi.fn((callback: unknown) => callback),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useReducer: reactMocks.useReducerMock,
    useCallback: reactMocks.useCallbackMock,
  };
});

import { IntakeProvider } from "./IntakeContext";
import { emptyCaseRecord } from "../types/case";

function readProviderValue(element: unknown) {
  expect(isValidElement(element)).toBe(true);
  if (!isValidElement(element)) {
    throw new Error("IntakeProvider did not return a valid React element.");
  }

  return (element as ReactElement<{ value: unknown }>).props.value;
}

describe("IntakeProvider participant and extraction callbacks", () => {
  const initialRecord = emptyCaseRecord("case_ctx_test", "2026-06-08T00:00:00.000Z");
  const dispatch = vi.fn();

  beforeEach(() => {
    dispatch.mockReset();
    reactMocks.useReducerMock.mockReset();
    reactMocks.useCallbackMock.mockClear();
    reactMocks.useReducerMock.mockReturnValue([
      {
        record: initialRecord,
        dirty: false,
        last_saved_at: initialRecord.updated_at,
        editSeq: 0,
      },
      dispatch,
    ]);
  });

  it("dispatches the current addAttorney payload shape", () => {
    const element = IntakeProvider({ initialRecord, children: null });
    const value = readProviderValue(element) as {
      addAttorney: (attorney: unknown) => void;
    };
    const attorney = {
      name: { value: "Karen M. Alvarado", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      firm: { value: "Brothers Law", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      representing: { value: "FOR THE DEFENDANT", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      bar_number: { value: "24012345", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      address: "123 Main",
      city: "San Antonio",
      state: "TX",
      zip: "78205",
      time_used: null,
      email: "karen@example.com",
      phone: "2105550101",
    };

    value.addAttorney(attorney);

    expect(dispatch).toHaveBeenCalledWith({
      type: "ADD_ATTORNEY",
      payload: { attorney },
    });
  });

  it("dispatches the current addInterpreter payload shape", () => {
    const element = IntakeProvider({ initialRecord, children: null });
    const value = readProviderValue(element) as {
      addInterpreter: (interpreter: unknown) => void;
    };
    const interpreter = {
      name: { value: "Maria Flores", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      language_from: "es",
      language_to: "en",
      oath_administered: true,
      certified: true,
      cert_number: "INT-1",
      agency: "Language Co",
      email: "maria@example.com",
      phone: "2105550202",
    };

    value.addInterpreter(interpreter);

    expect(dispatch).toHaveBeenCalledWith({
      type: "ADD_INTERPRETER",
      payload: { interpreter },
    });
  });

  it("dispatches the current addVideographer payload shape", () => {
    const element = IntakeProvider({ initialRecord, children: null });
    const value = readProviderValue(element) as {
      addVideographer: (videographer: unknown) => void;
    };
    const videographer = {
      name: { value: "Victor Video", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      firm: { value: "Video Firm", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role_title: "Legal Videographer",
      cert_number: "VID-9",
      email: "victor@example.com",
      phone: "2105550303",
    };

    value.addVideographer(videographer);

    expect(dispatch).toHaveBeenCalledWith({
      type: "ADD_VIDEOGRAPHER",
      payload: { videographer },
    });
  });

  it("dispatches the current addParticipant payload shape", () => {
    const element = IntakeProvider({ initialRecord, children: null });
    const value = readProviderValue(element) as {
      addParticipant: (participant: unknown) => void;
    };
    const participant = {
      name: { value: "Tiffany Netcher", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: "OTHER",
      organization: "Scheduling Co",
      email: "tiffany@example.com",
      phone: "2105550404",
      role_in_this_proceeding: "Scheduler",
      notes: "Prefers email",
    };

    value.addParticipant(participant);

    expect(dispatch).toHaveBeenCalledWith({
      type: "ADD_PARTICIPANT",
      payload: { participant },
    });
  });

  it("dispatches applyExtraction with the current payload pass-through", () => {
    const element = IntakeProvider({ initialRecord, children: null });
    const value = readProviderValue(element) as {
      applyExtraction: (application: {
        fieldUpdates: unknown[];
        attorneyAdds: unknown[];
        attorneyPatches: unknown[];
        witnessAdds: unknown[];
        witnessPatches: unknown[];
        partyAdds: unknown[];
        partyPatches: unknown[];
        lawFirmAdds: unknown[];
        lawFirmPatches: unknown[];
        keyterms: unknown[];
      }) => void;
    };
    const application = {
      fieldUpdates: [{ path: "caption.case_name", value: "Garza v. Home Depot", confidence_score: 0.92 }],
      attorneyAdds: [{ attorney: { name: { value: "Curtis L. Cukjati" } } }],
      attorneyPatches: [{ attorney_id: "attorney_1", patch: { phone: "2105550101" } }],
      witnessAdds: [{ witness: { name: { value: "Delia Garza" } } }],
      witnessPatches: [{ witness_id: "witness_1", patch: { email: "delia@example.com" } }],
      partyAdds: [{ party: { name: { value: "Home Depot" } } }],
      partyPatches: [{ party_id: "party_1", patch: { entity_type: { value: "company" } } }],
      lawFirmAdds: [{ law_firm: { name: { value: "Brothers Law" } } }],
      lawFirmPatches: [{ law_firm_id: "firm_1", patch: { phone: { value: "2105559999" } } }],
      keyterms: [{ term: "Delia Garza", boost: 0.5, category: "proper_name", notes: "derived" }],
    };

    value.applyExtraction(application);

    expect(dispatch).toHaveBeenCalledWith({
      type: "APPLY_EXTRACTION",
      payload: {
        fieldUpdates: application.fieldUpdates,
        attorneyAdds: application.attorneyAdds,
        attorneyPatches: application.attorneyPatches,
        witnessAdds: application.witnessAdds,
        witnessPatches: application.witnessPatches,
        partyAdds: application.partyAdds,
        partyPatches: application.partyPatches,
        lawFirmAdds: application.lawFirmAdds,
        lawFirmPatches: application.lawFirmPatches,
        keyterms: application.keyterms,
      },
    });
  });
});
