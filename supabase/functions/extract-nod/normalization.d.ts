import type {
  ExtractedAttorney,
  ExtractedConfidenceValue,
  ExtractedLawFirm,
  ExtractedNODFields,
  ExtractedParticipant,
  ExtractedParty,
} from "../../../src/lib/parsing/aiExtractionTypes";

export interface CoercedExtractionField<T = unknown> {
  value: T | null;
  confidence: number | null;
  inferred?: true;
}

export function clampConfidence(value: unknown): number | null;
export function coerceExtractionField<T = unknown>(
  field: unknown,
  options?: { confidence?: number | null; inferred?: boolean },
): CoercedExtractionField<T>;
export function normalizeStringField(
  field: unknown,
  options?: { confidence?: number | null; inferred?: boolean },
): ExtractedConfidenceValue<string>;
export function normalizeStringArrayField(
  field: unknown,
  options?: { confidence?: number | null; inferred?: boolean },
): ExtractedConfidenceValue<string[]>;
export function normalizeBooleanField(
  field: unknown,
  options?: { confidence?: number | null; inferred?: boolean },
): ExtractedConfidenceValue<boolean>;
export function normalizeSide(value: unknown): "plaintiff" | "defense" | "other" | null;
export function normalizeSideField(
  field: unknown,
  representing: string | null,
  plaintiff: string | null,
  defendants: string[] | null,
  attorneyFirm: string | null,
  plaintiffFirms: string[],
): ExtractedConfidenceValue<"plaintiff" | "defense" | "other">;
export function normalizeAttorney(
  attorney: Record<string, unknown>,
  plaintiff: string | null,
  defendants: string[] | null,
  plaintiffFirms: string[],
): ExtractedAttorney;
export function normalizeParticipant(participant: Record<string, unknown>): ExtractedParticipant;
export function normalizeParty(party: Record<string, unknown>): ExtractedParty;
export function normalizeLawFirm(lawFirm: Record<string, unknown>): ExtractedLawFirm;
export function normalizeFields(raw: Record<string, unknown>, sourceText?: string): ExtractedNODFields;
