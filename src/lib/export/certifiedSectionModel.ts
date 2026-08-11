// DOC-0328 — certified front/back-matter SECTION MODEL (targets #3, #4, #5, #6).
//
// The semantic assembly of the certified non-body pages as typed data, one step before
// rendering. It composes:
//   - the caption / title-page fields          (#4)  from the transported UFM envelope
//   - the appearances                           (#5)  from the UFM envelope
//   - the reporter's certificate fields         (#6)  from the UFM envelope
//   - the examination + exhibit indexes         (#8)  from the FinalizedTranscriptModel
//   - the errata rows                           (#7)  resolved over the PaginationMap
//
// It is PURE DATA — it introduces no renderer, geometry, or pagination authority. The
// formatter_core renderer that turns these DTOs into the certified DOCX/PDF (the
// _lined_page geometry) and its wiring into the live export path (#10) + deployment are
// the activation Human Gate and are deliberately NOT built here.
//
// No fabrication: every field is read from the transported UfmMetadataEnvelope (built
// upstream from Intake evidence) or the finalized model. A null envelope yields a
// well-formed section model with null/empty fields — never invented values.
import type { UfmMetadataEnvelope } from "../ufm/buildUfmMetadata";
import type { FinalizedTranscriptModel } from "./finalizedTranscriptModel";
import type { ExaminationIndexRow, ExhibitIndexRow } from "./certifiedIndexModel";
import { buildErrataRows, type ErrataChangeRequest, type ErrataRow } from "./errataModel";

/** Title-page / caption fields (front matter). */
export interface CaptionSection {
  causeNumber: string | null;
  caption: string | null;
  court: string | null;
  judicialDistrict: string | null;
  division: string | null;
  county: string | null;
  state: string | null;
  jurisdictionType: string | null;
  deponent: string | null;
  depositionDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  locationType: string | null;
}

/** One appearance line (attorney / interpreter / videographer / participant). */
export interface AppearanceEntry {
  category: string | null;
  name: string | null;
  firm: string | null;
  role: string | null;
  representing: string | null;
  barNumber: string | null;
  email: string | null;
  phone: string | null;
}

export interface AppearancesSection {
  entries: AppearanceEntry[];
}

/** Reporter's-certificate identity fields (back matter). */
export interface ReporterCertificateSection {
  reporterName: string | null;
  csrLicense: string | null;
  firmRegistration: string | null;
  csrCertExpiration: string | null;
  deponent: string | null;
  caption: string | null;
  causeNumber: string | null;
}

/** The full certified non-body assembly. */
export interface CertifiedFrontBackMatter {
  caption: CaptionSection;
  appearances: AppearancesSection;
  reporterCertificate: ReporterCertificateSection;
  examinationIndex: ExaminationIndexRow[];
  exhibitIndex: ExhibitIndexRow[];
  errata: ErrataRow[];
  /** Errata change requests whose location was not found in the pagination map. */
  unresolvedErrata: ErrataChangeRequest[];
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function metaField(envelope: UfmMetadataEnvelope | null, key: string): unknown {
  if (!envelope) {
    return null;
  }
  return (envelope.ufm_metadata as Record<string, unknown>)[key] ?? null;
}

function buildCaption(envelope: UfmMetadataEnvelope | null): CaptionSection {
  return {
    causeNumber: str(metaField(envelope, "cause_number")),
    caption: str(metaField(envelope, "caption")),
    court: str(metaField(envelope, "court")),
    judicialDistrict: str(metaField(envelope, "judicial_district")),
    division: str(metaField(envelope, "division")),
    county: str(metaField(envelope, "county")),
    state: str(metaField(envelope, "state")),
    jurisdictionType: str(metaField(envelope, "jurisdiction_type")),
    deponent: str(metaField(envelope, "deponent")),
    depositionDate: str(metaField(envelope, "deposition_date")),
    startTime: str(metaField(envelope, "start_time")),
    endTime: str(metaField(envelope, "end_time")),
    location: str(metaField(envelope, "address")),
    locationType: str(metaField(envelope, "location_type")),
  };
}

function buildAppearances(envelope: UfmMetadataEnvelope | null): AppearancesSection {
  const raw = metaField(envelope, "appearances");
  if (!Array.isArray(raw)) {
    return { entries: [] };
  }
  const entries = raw.map((item): AppearanceEntry => {
    const a = (item ?? {}) as Record<string, unknown>;
    return {
      category: str(a.category),
      name: str(a.name),
      firm: str(a.firm),
      role: str(a.role),
      representing: str(a.representing),
      barNumber: str(a.bar_number),
      email: str(a.email),
      phone: str(a.phone),
    };
  });
  return { entries };
}

function buildReporterCertificate(envelope: UfmMetadataEnvelope | null): ReporterCertificateSection {
  return {
    reporterName: str(metaField(envelope, "csr_name")),
    csrLicense: str(metaField(envelope, "csr_license")),
    firmRegistration: str(metaField(envelope, "firm_registration")),
    csrCertExpiration: str(metaField(envelope, "csr_cert_expiration")),
    deponent: str(metaField(envelope, "deponent")),
    caption: str(metaField(envelope, "caption")),
    causeNumber: str(metaField(envelope, "cause_number")),
  };
}

export interface BuildCertifiedSectionsOptions {
  /** Witness change requests for the errata page; resolved over the finalized pagination. */
  errataChanges?: readonly ErrataChangeRequest[];
}

/**
 * Assemble the certified front/back-matter section model from a FinalizedTranscriptModel.
 * Pure and deterministic. Metadata is read from the model's transported envelope; the
 * indexes come from the model; the errata rows are resolved over the model's pagination.
 */
export function buildCertifiedSections(
  model: FinalizedTranscriptModel,
  options: BuildCertifiedSectionsOptions = {},
): CertifiedFrontBackMatter {
  const errata = buildErrataRows(options.errataChanges, model.pagination);
  return {
    caption: buildCaption(model.metadata),
    appearances: buildAppearances(model.metadata),
    reporterCertificate: buildReporterCertificate(model.metadata),
    examinationIndex: model.examinationIndex,
    exhibitIndex: model.exhibitIndex,
    errata: errata.rows,
    unresolvedErrata: errata.unresolved,
  };
}
