// DOC-0328 — cross-runtime output proof, TS producer half.
//
// Builds the versioned certified transport from a persisted-line-type-ON scenario (an
// accepted qa_split), and snapshots it to a shared fixture that the Python renderer test
// (formatter_service/tests/test_certified_cross_runtime.py) consumes. Together they prove:
//   persisted reviewed line_type -> Working Transcript -> FinalizedTranscriptModel
//     -> serialized certified transport (this fixture) -> formatter_core -> complete DOCX.
// This half proves the TS pipeline EMITS exactly this contract, with the reviewed Q/A
// split present in the body render model.
import { describe, expect, it } from "vitest";
import type { EditorDocument, Utterance, Word } from "../../api/types";
import type { CorrectionObject } from "../transcript/correctionObject";
import type { UfmMetadataEnvelope } from "../ufm/buildUfmMetadata";
import { emptyCaseRecord } from "../../types/case";
import { buildCanonicalExportRenderModel } from "./exportAdapter";
import { buildFinalizedTranscriptModel } from "./finalizedTranscriptModel";
import { buildCertifiedSections } from "./certifiedSectionModel";
import { buildCertifiedTransport, CERTIFIED_TRANSPORT_VERSION } from "./certifiedTransport";
import { buildExportServiceRequest, validateExportServiceRequest } from "./exportServiceContract";

const RECORD = () => emptyCaseRecord("case-xr", "2026-07-22T00:00:00.000Z");

function word(id: string, text: string, uttId: string, speaker: string, t: number): Word {
  return { word_id: id, text, raw_text: text, speaker_id: speaker, utterance_id: uttId, start_time: t, end_time: t + 0.3, confidence: 1, reviewed: false, edited: false } as Word;
}

function scenarioDoc(): EditorDocument {
  const utterances: Utterance[] = [
    { utterance_id: "u0", speaker_id: "spk-atty", start_time: 0, end_time: 1, word_ids: ["a0", "a1", "a2"] },
    { utterance_id: "u1", speaker_id: "spk-wit", start_time: 1, end_time: 2, word_ids: ["b0", "b1", "b2"] },
    { utterance_id: "u2", speaker_id: "spk-atty", start_time: 2, end_time: 4, word_ids: ["c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7"] },
    { utterance_id: "u3", speaker_id: "spk-rptr", start_time: 4, end_time: 5, word_ids: ["e0", "e1", "e2", "e3", "e4", "e5"] },
  ] as unknown as Utterance[];
  const words: Word[] = [
    word("a0", "Please", "u0", "spk-atty", 0), word("a1", "state", "u0", "spk-atty", 0.3), word("a2", "everything.", "u0", "spk-atty", 0.6),
    word("b0", "I", "u1", "spk-wit", 1), word("b1", "am", "u1", "spk-wit", 1.3), word("b2", "ready.", "u1", "spk-wit", 1.6),
    // u2 combined: "You understand the oath? | Yes I understand completely." split after c3.
    word("c0", "You", "u2", "spk-atty", 2), word("c1", "understand", "u2", "spk-atty", 2.2), word("c2", "the", "u2", "spk-atty", 2.4), word("c3", "oath?", "u2", "spk-atty", 2.6),
    word("c4", "Yes", "u2", "spk-atty", 2.8), word("c5", "I", "u2", "spk-atty", 3.0), word("c6", "understand", "u2", "spk-atty", 3.2), word("c7", "completely.", "u2", "spk-atty", 3.4),
    word("e0", "(Exhibit", "u3", "spk-rptr", 4), word("e1", "1", "u3", "spk-rptr", 4.2), word("e2", "was", "u3", "spk-rptr", 4.4), word("e3", "marked", "u3", "spk-rptr", 4.6), word("e4", "for", "u3", "spk-rptr", 4.8), word("e5", "identification.)", "u3", "spk-rptr", 5.0),
  ];
  return {
    job_id: "xr", media_url: null, duration: 5,
    speakers: [
      { speaker_id: "spk-atty", display_name: "MR. SMITH", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk-wit", display_name: "THE WITNESS", deepgram_speaker: 1, role: "WITNESS" },
      { speaker_id: "spk-rptr", display_name: "THE REPORTER", deepgram_speaker: 2, role: "OTHER" },
    ],
    utterances, words,
  } as unknown as EditorDocument;
}

function qaSplit(): CorrectionObject {
  return {
    id: "corr_01HXA92NVXZM3K4T7B2R9WQPD5",
    transcript_id: "xr", case_id: "case-xr", specialty: "qa_split", prompt_version: "v1",
    location: { paragraph_id: "u2", start_word_id: "c0", end_word_id: "c7" },
    change: { type: "qa_split", structural_change: { split_after_word_id: "c3", new_q_paragraph_speaker_id: "spk-atty", new_a_paragraph_speaker_id: "spk-wit" } },
    reason: "Inline attorney question immediately followed by the witness answer.",
    reason_kind: "structural_boundary", confidence: 0.95,
    provenance: { source: "ai", provider: "anthropic", generated_at: "2026-08-11T00:00:00Z" },
    review: { state: "accepted" },
    downstream: { applied_to_working_transcript: false },
  } as CorrectionObject;
}

// Deterministic metadata envelope (front matter + certificate source).
function metadata(): UfmMetadataEnvelope {
  return {
    case_id: "case-xr",
    computed_at: "2026-07-22T00:00:00.000Z",
    ufm_metadata: {
      cause_number: "2026-CI-01234",
      caption: "JANE DOE vs. ACME CORP.",
      court: "285th District Court",
      judicial_district: "285th",
      county: "Bexar",
      state: "Texas",
      deponent: "JANE DOE",
      deposition_date: "July 22, 2026",
      start_time: "9:00 a.m.",
      end_time: "11:30 a.m.",
      address: "123 Main St, San Antonio, Texas",
      csr_name: "MARY REPORTER",
      csr_license: "CSR-9999",
      firm_registration: "FIRM-123",
      csr_cert_expiration: "12/31/2027",
      appearances: [
        { category: "attorney", name: "MR. SMITH", firm: "Smith LLP", representing: "Plaintiff", bar_number: "12345", phone: "555-1000" },
        { category: "attorney", name: "MS. JONES", firm: "Jones PC", representing: "Defendant", bar_number: "67890" },
      ],
    },
    field_sources: {},
    field_confirmations: {},
    missing_required_fields: [],
  } as unknown as UfmMetadataEnvelope;
}

describe("certified transport (cross-runtime output proof, producer half)", () => {
  const corrections = [qaSplit()];
  const finalized = buildFinalizedTranscriptModel(scenarioDoc(), RECORD(), { corrections, persistedLineTypeEnabled: true, metadata: metadata() });
  const renderModel = buildCanonicalExportRenderModel(scenarioDoc(), RECORD(), corrections, true);
  const sections = buildCertifiedSections(finalized, {
    errataChanges: [{ utteranceId: "u2::a", from: "completely", to: "fully", reason: "witness clarification" }],
  });
  const payload = buildCertifiedTransport({ renderModel, sections });

  it("emits the versioned transport with the reviewed line_type split in the body", () => {
    expect(payload.version).toBe(CERTIFIED_TRANSPORT_VERSION);
    const contents = payload.renderModel.lines.map((l) => l.content).join("\n");
    // The reviewed qa_split produced distinct Q and A units, both observable in the body.
    expect(contents).toContain("understand the oath");
    expect(contents).toContain("understand completely");
  });

  it("carries the certified sections derived from metadata + canonical pagination", () => {
    expect(payload.certified.witnessName).toBe("JANE DOE");
    expect(payload.certified.reporterCertificate.reporterName).toBe("MARY REPORTER");
    expect(payload.certified.caption.causeNumber).toBe("2026-CI-01234");
    // Exhibit parenthetical detected -> exhibit index row; errata resolved to a page:line.
    expect(payload.certified.exhibitIndex.map((e) => e.exhibit_number)).toContain("1");
    expect(payload.certified.errata).toHaveLength(1);
    expect(payload.certified.errata[0].page).toBeGreaterThanOrEqual(1);
  });

  it("carries the certified sections through the real ExportServiceRequest (app seam)", () => {
    const request = buildExportServiceRequest({
      renderModel,
      formats: ["DOCX"],
      idempotencyKey: "req-cert-001",
      certified: payload.certified,
    });
    expect(request.certified).toBe(payload.certified);
    expect(() => validateExportServiceRequest(request)).not.toThrow();

    // Default-off: omitting certified yields a request without the field (byte-path unchanged).
    const plain = buildExportServiceRequest({ renderModel, formats: ["DOCX"], idempotencyKey: "req-plain" });
    expect(plain.certified).toBeUndefined();
    expect(() => validateExportServiceRequest(plain)).not.toThrow();
  });

  it("matches the committed cross-runtime fixture consumed by the Python renderer", async () => {
    await expect(`${JSON.stringify(payload, null, 2)}\n`).toMatchFileSnapshot("__fixtures__/certifiedTransport.fixture.json");
  });
});
