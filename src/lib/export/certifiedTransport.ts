// DOC-0328 — the ONE versioned certified transport (TS producer side).
//
// The export service already ships the body `UnifiedRenderModel` to the surviving Python
// renderer (formatter_core). This module carries the certified SECTION data alongside it
// through a single, explicitly versioned payload — no second canonical data model, no
// downstream renormalization. The Python renderer (formatter_core.certified_sections)
// consumes the `certified` object field-for-field.
//
// INERT / additive: this is not wired into the live ExportServiceRequest yet; it is the
// reviewable, testable transport shape + the seam for the cross-runtime output proof.
import type { UnifiedRenderModel } from "../transcript/unifiedRendering";
import type { CertifiedFrontBackMatter } from "./certifiedSectionModel";

/** Bump only when the certified payload shape changes; the Python parser pins the same value. */
export const CERTIFIED_TRANSPORT_VERSION = "2026-08-11";

/** Optional notary/signature fields for the changes-&-signature page (never fabricated). */
export interface CertifiedNotaryFields {
  notaryCounty?: string | null;
  notaryName?: string | null;
  identificationMethod?: string | null;
}

/** The certified data the Python renderer consumes (mirrors its `certified_data` dict). */
export interface CertifiedTransportSections {
  caption: CertifiedFrontBackMatter["caption"];
  appearances: CertifiedFrontBackMatter["appearances"]["entries"];
  reporterCertificate: CertifiedFrontBackMatter["reporterCertificate"];
  examinationIndex: CertifiedFrontBackMatter["examinationIndex"];
  exhibitIndex: CertifiedFrontBackMatter["exhibitIndex"];
  errata: CertifiedFrontBackMatter["errata"];
  witnessName: string | null;
  depoDate: string | null;
  notaryCounty?: string | null;
  notaryName?: string | null;
  identificationMethod?: string | null;
}

/** The full versioned transport: the body render model + the certified sections. */
export interface CertifiedTransportPayload {
  version: typeof CERTIFIED_TRANSPORT_VERSION;
  renderModel: UnifiedRenderModel;
  certified: CertifiedTransportSections;
}

/**
 * Assemble the certified transport payload from an already-built body render model and
 * the certified section model. Pure and deterministic. Flattens `appearances.entries`
 * and drops `unresolvedErrata` (the certified page cannot cite an unresolved location);
 * the witness/date come from the caption unless overridden.
 */
export function buildCertifiedTransport(input: {
  renderModel: UnifiedRenderModel;
  sections: CertifiedFrontBackMatter;
  witnessName?: string | null;
  depoDate?: string | null;
  notary?: CertifiedNotaryFields;
}): CertifiedTransportPayload {
  const { renderModel, sections, notary } = input;
  return {
    version: CERTIFIED_TRANSPORT_VERSION,
    renderModel,
    certified: {
      caption: sections.caption,
      appearances: sections.appearances.entries,
      reporterCertificate: sections.reporterCertificate,
      examinationIndex: sections.examinationIndex,
      exhibitIndex: sections.exhibitIndex,
      errata: sections.errata,
      witnessName: input.witnessName ?? sections.caption.deponent,
      depoDate: input.depoDate ?? sections.caption.depositionDate,
      // Notary jurat fields come from the transported envelope (sections.notary); an
      // explicit `notary` override wins when provided. Never fabricated.
      notaryCounty: notary?.notaryCounty ?? sections.notary.county,
      notaryName: notary?.notaryName ?? sections.notary.name,
      identificationMethod: notary?.identificationMethod ?? sections.notary.identificationMethod,
    },
  };
}
