// TypeScript side of the CorrectionObject contract (ATIA §4.8, D8.1).
//
// Contract of record: the co-located JSON Schema
// src/lib/transcript/correction_object.schema.json (surviving governed home,
// relocated from the retiring Python transcript_formatter/schema/ per DOC-0327).
// This module is the SURVIVING PRODUCTION AUTHORITY — the only CorrectionObject
// definition on a live path (frontend + ai-review Edge Function). The schema is
// kept in lockstep by a drift test (correctionObjectSchema.test.ts) that fails if
// the enums/required diverge, so the two are mechanically synchronized rather than
// independently authored. The Python validator (services/tie/correction_object.py)
// derives from the same schema and retires with transcript_formatter/.
// The per-type rules below are the schema's change.allOf branches.
//
// A CorrectionObject is one proposed change against the immutable Deepgram
// baseline: produced by an AI (bridge/specialty) prompt or a deterministic rule,
// reviewed by a human court reporter.

export type CorrectionSpecialty =
  | "proper_name_novel"
  | "medical_context"
  | "qa_split"
  | "speaker_reassignment"
  | "objection_attribution"
  | "examination_section"
  | "off_record_boundary"
  | "inconsistency_flag"
  | "contextual_number"
  | "phonetic_disambiguation"
  | "deterministic_rule";

export type CorrectionChangeType =
  | "proper_name_correction"
  | "medical_term_correction"
  | "speaker_reassignment"
  | "qa_split"
  // Structural EXTRACTION of an embedded objection into its own unit (DOC-0325
  // Wave 4 / Decision B). Deliberately SEPARATE from objection_attribution: this
  // type owns only the split boundary (the objection word span); attribution
  // (which attorney objected) is a distinct concern that may be resolved or left
  // unidentified. structural_change: {objection_start_word_id, objection_end_word_id,
  // objector_speaker_id?}. Never carries a fabricated speaker.
  | "objection_split"
  | "objection_attribution"
  | "examination_section_change"
  | "off_record_boundary_mark"
  | "inconsistency_flag"
  | "contextual_number_flag";

export type ReasonKind =
  | "registry_match"
  | "phonetic_similarity"
  | "context_pattern"
  | "prior_correction"
  | "inconsistency_detected"
  | "structural_boundary"
  | "confidence_threshold"
  | "reporter_preference"
  | "rule_pattern";

export type ReviewState = "pending" | "accepted" | "rejected" | "edited" | "superseded";
export type ProvenanceSource = "ai" | "deterministic" | "reporter";

// change.type sets that gate before/after vs structural_change (schema allOf).
export const TEXT_CHANGE_TYPES: ReadonlySet<CorrectionChangeType> = new Set([
  "proper_name_correction",
  "medical_term_correction",
  "contextual_number_flag",
]);
export const STRUCTURAL_CHANGE_TYPES: ReadonlySet<CorrectionChangeType> = new Set([
  "speaker_reassignment",
  "qa_split",
  "objection_split",
  "objection_attribution",
  "examination_section_change",
  "off_record_boundary_mark",
]);

export interface CorrectionLocation {
  paragraph_id: string;
  start_word_id: string;
  end_word_id: string;
  start_offset_ms?: number;
  end_offset_ms?: number;
}

export interface CorrectionChange {
  type: CorrectionChangeType;
  before?: string;
  after?: string;
  structural_change?: Record<string, unknown>;
}

export interface CorrectionProvenance {
  source: ProvenanceSource;
  provider?: string;
  model?: string;
  prompt_versions?: Record<string, string>;
  context_hash?: string;
  generated_at: string;
}

export interface CorrectionReview {
  state: ReviewState;
  decided_by?: string | null;
  decided_at?: string | null;
  decision_note?: string | null;
  final_value?: Record<string, unknown> | null;
}

export type SupportingEvidenceKind =
  | "registry_entry"
  | "deepgram_confidence"
  | "prior_transcript_correction"
  | "glossary_entry"
  | "speaker_pattern_match"
  | "phonetic_similarity_score";

export interface CorrectionSupportingEvidence {
  kind: SupportingEvidenceKind;
  id?: string;
  value?: string | number;
  case_id?: string;
}

export interface CorrectionDownstream {
  applied_to_working_transcript?: boolean;
  applied_at?: string | null;
  reverted_at?: string | null;
  // Set when review.state is accepted/edited but applied_to_working_transcript is
  // false: accepted, apply deferred (e.g. qa_split awaiting the structural apply
  // engine). Workspace shows "accepted — apply pending" rather than a silent no-op.
  pending_reason?: string | null;
}

export interface CorrectionObject {
  id: string;
  transcript_id: string;
  case_id: string;
  specialty: CorrectionSpecialty;
  prompt_version: string;
  location: CorrectionLocation;
  change: CorrectionChange;
  reason: string;
  reason_kind: ReasonKind;
  confidence: number;
  confidence_source?: string;
  provenance: CorrectionProvenance;
  supporting_evidence?: CorrectionSupportingEvidence[];
  review: CorrectionReview;
  downstream: CorrectionDownstream;
}

const SPECIALTIES = new Set<string>([
  "proper_name_novel", "medical_context", "qa_split", "speaker_reassignment",
  "objection_attribution", "examination_section", "off_record_boundary",
  "inconsistency_flag", "contextual_number", "phonetic_disambiguation", "deterministic_rule",
]);
const CHANGE_TYPES = new Set<string>([...TEXT_CHANGE_TYPES, ...STRUCTURAL_CHANGE_TYPES, "inconsistency_flag"]);
const REASON_KINDS = new Set<string>([
  "registry_match", "phonetic_similarity", "context_pattern", "prior_correction",
  "inconsistency_detected", "structural_boundary", "confidence_threshold",
  "reporter_preference", "rule_pattern",
]);
const PROVENANCE_SOURCES = new Set<string>(["ai", "deterministic", "reporter"]);
const REVIEW_STATES = new Set<string>(["pending", "accepted", "rejected", "edited", "superseded"]);

const ID_PATTERN = /^corr_[0-9A-Z]{26}$/;
const REASON_MIN = 10;
const REASON_MAX = 500;
const GENERIC_REASONS = new Set(["improved clarity", "looks better", "better", "clarity", "fix", "correction"]);

export class CorrectionValidationError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super(errors.join("; ") || "invalid correction");
    this.name = "CorrectionValidationError";
    this.errors = errors;
  }
}

// Returns the list of contract violations ([] when valid). Mirrors the Python
// validator in services/tie/correction_object.py.
export function collectCorrectionErrors(data: unknown): string[] {
  const errors: string[] = [];
  if (!data || typeof data !== "object") {
    return ["correction must be an object"];
  }
  const c = data as Record<string, unknown>;

  if (typeof c.id !== "string" || !ID_PATTERN.test(c.id)) {
    errors.push("id must match ^corr_[0-9A-Z]{26}$");
  }
  for (const field of ["transcript_id", "case_id", "prompt_version"]) {
    if (typeof c[field] !== "string" || !(c[field] as string)) errors.push(`${field} is required`);
  }
  if (!SPECIALTIES.has(c.specialty as string)) errors.push(`specialty invalid: ${String(c.specialty)}`);
  if (!REASON_KINDS.has(c.reason_kind as string)) errors.push(`reason_kind invalid: ${String(c.reason_kind)}`);

  const reason = c.reason;
  if (typeof reason !== "string") {
    errors.push("reason must be a string");
  } else {
    if (reason.length < REASON_MIN || reason.length > REASON_MAX) {
      errors.push(`reason length must be ${REASON_MIN}-${REASON_MAX} (got ${reason.length})`);
    }
    if (GENERIC_REASONS.has(reason.trim().toLowerCase())) errors.push(`reason is too generic: ${reason}`);
  }

  const conf = c.confidence;
  if (typeof conf !== "number" || Number.isNaN(conf) || conf < 0 || conf > 1) {
    errors.push(`confidence must be a number in [0,1] (got ${String(conf)})`);
  }

  errors.push(...locationErrors(c.location));
  errors.push(...changeErrors(c.change));
  errors.push(...provenanceErrors(c.provenance));
  errors.push(...reviewErrors(c.review));
  errors.push(...downstreamErrors(c.downstream));
  return errors;
}

export function validateCorrection(data: unknown): asserts data is CorrectionObject {
  const errors = collectCorrectionErrors(data);
  if (errors.length > 0) throw new CorrectionValidationError(errors);
}

function locationErrors(loc: unknown): string[] {
  if (!loc || typeof loc !== "object") return ["location must be an object"];
  const l = loc as Record<string, unknown>;
  const errs: string[] = [];
  for (const key of ["paragraph_id", "start_word_id", "end_word_id"]) {
    if (!l[key]) errs.push(`location.${key} is required`);
  }
  return errs;
}

function changeErrors(change: unknown): string[] {
  if (!change || typeof change !== "object") return ["change must be an object"];
  const ch = change as Record<string, unknown>;
  const type = ch.type as string;
  if (!CHANGE_TYPES.has(type)) return [`change.type invalid: ${String(type)}`];

  const errs: string[] = [];
  const hasBefore = ch.before != null;
  const hasAfter = ch.after != null;
  const hasStructural = ch.structural_change != null && typeof ch.structural_change === "object";

  if (TEXT_CHANGE_TYPES.has(type as CorrectionChangeType)) {
    if (!hasBefore || !hasAfter) errs.push(`change.type '${type}' requires both 'before' and 'after'`);
  } else if (STRUCTURAL_CHANGE_TYPES.has(type as CorrectionChangeType)) {
    if (!hasStructural) errs.push(`change.type '${type}' requires 'structural_change'`);
    if (hasBefore || hasAfter) errs.push(`change.type '${type}' must not carry 'before'/'after' text`);
  }
  return errs;
}

function provenanceErrors(prov: unknown): string[] {
  if (!prov || typeof prov !== "object") return ["provenance must be an object"];
  const p = prov as Record<string, unknown>;
  const errs: string[] = [];
  if (!p.generated_at) errs.push("provenance.generated_at is required");
  if (!PROVENANCE_SOURCES.has(p.source as string)) {
    errs.push(`provenance.source invalid: ${String(p.source)}`);
  } else if (p.source === "ai" && !p.provider) {
    errs.push("provenance.provider is required when source == 'ai'");
  }
  return errs;
}

function reviewErrors(review: unknown): string[] {
  if (!review || typeof review !== "object") return ["review must be an object"];
  const r = review as Record<string, unknown>;
  if (!REVIEW_STATES.has(r.state as string)) return [`review.state invalid: ${String(r.state)}`];
  return [];
}

// downstream is a schema-required object (the Python validator enforces it via the
// schema's `required` list). TS previously skipped it, so a payload missing
// downstream passed TS but failed Python/schema — this closes that divergence.
function downstreamErrors(downstream: unknown): string[] {
  if (!downstream || typeof downstream !== "object") return ["downstream must be an object"];
  return [];
}

// corr_ + 26-char Crockford base32 ULID (48-bit ms timestamp + 80 bits random).
// Uses Web Crypto — available in both the browser and the Deno Edge runtime.
const _CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function newCorrectionId(now: number = Date.now()): string {
  const rand = new Uint8Array(10);
  crypto.getRandomValues(rand);
  let value = (BigInt(now) & ((1n << 48n) - 1n)) << 80n;
  for (const byte of rand) value = (value << 8n) | BigInt(byte);
  let out = "";
  for (let i = 0; i < 26; i += 1) {
    out = _CROCKFORD[Number(value & 31n)] + out;
    value >>= 5n;
  }
  return "corr_" + out;
}
