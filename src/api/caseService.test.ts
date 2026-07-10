import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateCaseId, listRecentCases, saveCase } from "./caseService";
import { emptyCaseRecord } from "../types/case";

const casesSelect = vi.fn();
const casesUpsert = vi.fn();
const caseAudioSelect = vi.fn();
const transcriptsSelect = vi.fn();
const exhibitsSelect = vi.fn();
const certificationsSelect = vi.fn();
const certificationsUpsert = vi.fn();
const certificationsDeleteEq = vi.fn();
const certificationsDelete = vi.fn();

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: vi.fn(async () => ({
    from(table: string) {
      if (table === "cases") {
        return { select: casesSelect, upsert: casesUpsert };
      }
      if (table === "case_audio") {
        return { select: caseAudioSelect };
      }
      if (table === "transcripts") {
        return { select: transcriptsSelect };
      }
      if (table === "case_exhibits") {
        return { select: exhibitsSelect };
      }
      if (table === "case_certifications") {
        return {
          select: certificationsSelect,
          upsert: certificationsUpsert,
          delete: certificationsDelete,
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  })),
}));

function collectConfirmedValues(value: unknown): boolean[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (
    "value" in value
    && "source" in value
    && "confirmed" in value
    && "conflict" in value
    && "confidence_score" in value
  ) {
    return [(value as { confirmed: boolean }).confirmed];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectConfirmedValues(item));
  }

  return Object.values(value).flatMap((item) => collectConfirmedValues(item));
}

describe("generateCaseId", () => {
  it("formats ids as case_YYYYMMDD_xxxxxx", () => {
    const id = generateCaseId(new Date("2026-06-05T12:00:00Z"), 0.5);
    expect(id).toMatch(/^case_20260605_[0-9a-z]{6}$/);
  });

  it("produces unique ids across 1000 draws", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateCaseId()));
    expect(ids.size).toBe(1000);
  });
});

describe("emptyCaseRecord", () => {
  it("starts with no pre-confirmed extracted fields", () => {
    const record = emptyCaseRecord("case_20260605_000001", "2026-06-05T12:00:00Z");
    expect(collectConfirmedValues(record).every((confirmed) => confirmed === false)).toBe(true);
  });
});

describe("listRecentCases", () => {
  beforeEach(() => {
    casesSelect.mockReset();
    casesUpsert.mockReset();
    caseAudioSelect.mockReset();
    transcriptsSelect.mockReset();
    exhibitsSelect.mockReset();
    certificationsSelect.mockReset();
    certificationsUpsert.mockReset();
    certificationsDeleteEq.mockReset();
    certificationsDelete.mockReset();
    certificationsDelete.mockReturnValue({ eq: certificationsDeleteEq });
    certificationsDeleteEq.mockResolvedValue({ error: null });
    casesUpsert.mockResolvedValue({ error: null });
    certificationsUpsert.mockResolvedValue({ error: null });
  });

  it("assembles recent cases with grouped indicator queries and excludes archived rows", async () => {
    const activeRecord = emptyCaseRecord("case_live", "2026-06-05T18:00:00.000Z");
    activeRecord.caption.case_name.value = "Goldman & Peterson";
    activeRecord.caption.case_style.value = "Maria L. Lopez De Martinez v. Rafael Robles Calderon";
    activeRecord.witnesses = [{
      witness_id: "wit_live",
      name: { value: "Maria L. Lopez De Martinez", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "WITNESS", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      title: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      employer: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      prefix_suffix: null,
      party_affiliation: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      is_corporate_rep: false,
      corporate_entity: null,
      read_and_sign: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      requires_interpreter: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      requires_videographer: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      spelling_corrections: [],
      email: null,
      phone: null,
    }];

    const archivedRecord = {
      ...emptyCaseRecord("case_archived", "2026-06-05T18:01:00.000Z"),
      archived: true,
    };

    casesSelect.mockReturnValue({
      order: () => ({
        limit: async () => ({
          data: [
            {
              case_id: "case_live",
              stage: "workspace",
              updated_at: "2026-06-05T18:10:00.000Z",
              payload: activeRecord,
            },
            {
              case_id: "case_archived",
              stage: "intake",
              updated_at: "2026-06-05T18:09:00.000Z",
              payload: archivedRecord,
            },
          ],
          error: null,
        }),
      }),
    });

    caseAudioSelect.mockReturnValue({
      in: async () => ({ data: [{ case_id: "case_live" }], error: null }),
    });
    transcriptsSelect.mockReturnValue({
      in: async () => ({ data: [{ case_id: "case_live" }], error: null }),
    });
    exhibitsSelect.mockReturnValue({
      in: async () => ({ data: [{ case_id: "case_live" }, { case_id: "case_live" }], error: null }),
    });
    certificationsSelect.mockReturnValue({
      in: async () => ({
        data: [{ case_id: "case_live", certification_date: "2026-06-05" }],
        error: null,
      }),
    });

    await expect(listRecentCases()).resolves.toEqual([
      {
        case_id: "case_live",
        stage: "workspace",
        updated_at: "2026-06-05T18:10:00.000Z",
        archived: false,
        caseName: "Goldman & Peterson",
        caseStyle: "Maria L. Lopez De Martinez v. Rafael Robles Calderon",
        caseNumber: "",
        witnessName: "Maria L. Lopez De Martinez",
        hasAudio: true,
        hasTranscript: true,
        exhibitCount: 2,
        certified: true,
      },
    ]);
  });

  it("projects browser cards defensively from sparse payloads", async () => {
    casesSelect.mockReturnValue({
      order: () => ({
        limit: async () => ({
          data: [
            {
              case_id: "case_sparse",
              stage: "creation",
              updated_at: "2026-06-05T19:10:00.000Z",
              payload: {},
            },
          ],
          error: null,
        }),
      }),
    });

    caseAudioSelect.mockReturnValue({
      in: async () => ({ data: [], error: null }),
    });
    transcriptsSelect.mockReturnValue({
      in: async () => ({ data: [], error: null }),
    });
    exhibitsSelect.mockReturnValue({
      in: async () => ({ data: [], error: null }),
    });
    certificationsSelect.mockReturnValue({
      in: async () => ({ data: [], error: null }),
    });

    await expect(listRecentCases()).resolves.toEqual([
      {
        case_id: "case_sparse",
        stage: "creation",
        updated_at: "2026-06-05T19:10:00.000Z",
        archived: false,
        caseName: "Untitled Case",
        caseStyle: "",
        caseNumber: "",
        witnessName: "",
        hasAudio: false,
        hasTranscript: false,
        exhibitCount: 0,
        certified: false,
      },
    ]);
  });
});

describe("saveCase", () => {
  beforeEach(() => {
    casesUpsert.mockReset();
    certificationsUpsert.mockReset();
    certificationsDeleteEq.mockReset();
    certificationsDelete.mockReset();
    certificationsDelete.mockReturnValue({ eq: certificationsDeleteEq });
    certificationsDeleteEq.mockResolvedValue({ error: null });
    casesUpsert.mockResolvedValue({ error: null });
    certificationsUpsert.mockResolvedValue({ error: null });
  });

  it("persists certification payloads into case_certifications alongside the case row", async () => {
    const record = emptyCaseRecord("case_certified", "2026-06-05T12:00:00.000Z");
    record.certification = {
      certification_date: "2026-06-30",
      certification_statement: "Ready for release.",
      checklist: {
        review_complete: true,
        speaker_mapping_complete: true,
        confidence_review_complete: true,
        exhibits_complete: false,
        ufm_complete: false,
      },
      signature_hash: null,
    };

    await saveCase(record);

    expect(casesUpsert).toHaveBeenCalledTimes(1);
    expect(certificationsUpsert).toHaveBeenCalledTimes(1);
    expect(certificationsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        case_id: "case_certified",
        certification_date: "2026-06-30",
        certification_statement: "Ready for release.",
        checklist: record.certification.checklist,
        signature_hash: null,
      }),
      { onConflict: "case_id" },
    );
    expect(certificationsDelete).not.toHaveBeenCalled();
  });

  it("removes persisted certification rows when certification is cleared", async () => {
    const record = emptyCaseRecord("case_uncertified", "2026-06-05T12:00:00.000Z");

    await saveCase(record);

    expect(certificationsDelete).toHaveBeenCalledTimes(1);
    expect(certificationsDeleteEq).toHaveBeenCalledWith("case_id", "case_uncertified");
    expect(certificationsUpsert).not.toHaveBeenCalled();
  });
});
