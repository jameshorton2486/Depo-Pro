// DOC-0328 — FinalizedTranscriptModel: the canonical, immutable certified-transcript
// assembly that sits between the Working Transcript and the certified pages.
//
// It ties the certified pipeline into one node so the whole chain is queryable and
// reproducible:
//
//   persisted reviewed line_type
//     -> Working Transcript          (deriveWorkingTranscript, flag-gated)
//     -> CFE render                  (verbatim, no lexical correction)
//     -> PaginationMap               (buildCanonicalPaginationMap — the ONE paginator)
//     -> certified section/exhibit anchors + index rows
//
// It introduces NO second transcript, geometry, or pagination authority: pagination
// comes solely from `buildCanonicalPaginationMap` (the same deterministic cfe call the
// certified body is built from), and the indexes are the pure projection of that map's
// anchors. Metadata is TRANSPORTED, never fabricated — the caller supplies the UFM
// envelope (built upstream from Intake evidence) or null.
//
// INERT / default-off: nothing on the live export path consumes a FinalizedTranscriptModel
// yet. It is freeze-safe scaffolding + its committed coupling proof.
import type { EditorDocument } from "../../api/types";
import type { CaseRecord } from "../../types/case";
import type { CorrectionObject } from "../transcript/correctionObject";
import type { GeometryProfile } from "../format/types";
import type { UfmMetadataEnvelope } from "../ufm/buildUfmMetadata";
import { DEFAULT_GEOMETRY_PROFILE } from "../format/geometryProfile";
import { PERSISTED_LINE_TYPE_ENABLED } from "../transcript/lineTypeMigration";
import { buildCanonicalPaginationMap } from "./paginationProducer";
import { buildExaminationIndex, buildExhibitIndex } from "./certifiedIndexModel";
import type { ExaminationIndexRow, ExhibitIndexRow } from "./certifiedIndexModel";
import type { PaginationMap } from "./paginationContract";

/**
 * Which structural authority shaped the certified body. Records whether the persisted
 * reviewed line_type projection was active over supplied reviewed corrections — the
 * provenance the reporter's certification depends on (she certifies the structure she
 * reviewed).
 */
export interface LineTypeAuthority {
  /**
   * True when the persisted-line-type structural projection ran with reviewed
   * corrections present (deriveWorkingTranscript applied them to the Working
   * Transcript before CFE). False = verbatim baseline structure.
   */
  persistedLineTypeApplied: boolean;
  /** Number of reviewed structural corrections supplied to the projection. */
  reviewedCorrectionCount: number;
}

/** The canonical finalized certified-transcript assembly. */
export interface FinalizedTranscriptModel {
  transcriptId: string;
  lineTypeAuthority: LineTypeAuthority;
  /**
   * UFM front/back-matter metadata envelope, TRANSPORTED from Intake. Null until the
   * caller supplies it; never fabricated here.
   */
  metadata: UfmMetadataEnvelope | null;
  /** The one authoritative pagination (per-line coordinates + section/exhibit anchors). */
  pagination: PaginationMap;
  /** Witness-index rows (examination page refs), projected from the pagination anchors. */
  examinationIndex: ExaminationIndexRow[];
  /** Exhibit-index rows (marked/offered/admitted/excluded page refs), projected likewise. */
  exhibitIndex: ExhibitIndexRow[];
}

export interface BuildFinalizedTranscriptOptions {
  /** Reviewed structural corrections (qa_split / objection_split) for the projection. */
  corrections?: CorrectionObject[];
  /**
   * Override the persisted-line-type projection gate. Undefined -> the shipped
   * PERSISTED_LINE_TYPE_ENABLED default (off in production). The value used is the
   * same one that drives pagination, so authority and coordinates cannot disagree.
   */
  persistedLineTypeEnabled?: boolean;
  /** UFM metadata envelope to transport onto the model. Never synthesized here. */
  metadata?: UfmMetadataEnvelope | null;
  profile?: GeometryProfile;
}

/**
 * Build the canonical FinalizedTranscriptModel. Pure and deterministic: identical
 * (document, record, options) -> identical model. All certified coordinates derive
 * from the single `buildCanonicalPaginationMap` call, so the finalized model cannot
 * diverge from the certified body it describes.
 */
export function buildFinalizedTranscriptModel(
  document: EditorDocument,
  record: CaseRecord,
  options: BuildFinalizedTranscriptOptions = {},
): FinalizedTranscriptModel {
  const { corrections, metadata = null, profile = DEFAULT_GEOMETRY_PROFILE } = options;
  // Resolve the effective gate ONCE and thread the same value into pagination, so
  // lineTypeAuthority describes exactly the structure that was paginated.
  const effectiveEnabled = options.persistedLineTypeEnabled ?? PERSISTED_LINE_TYPE_ENABLED;

  const pagination = buildCanonicalPaginationMap(document, record, corrections, effectiveEnabled, profile);

  return {
    transcriptId: document.job_id,
    lineTypeAuthority: {
      persistedLineTypeApplied: effectiveEnabled && Array.isArray(corrections) && corrections.length > 0,
      reviewedCorrectionCount: corrections?.length ?? 0,
    },
    metadata,
    pagination,
    examinationIndex: buildExaminationIndex(pagination),
    exhibitIndex: buildExhibitIndex(pagination),
  };
}
