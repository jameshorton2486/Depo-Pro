export interface FieldSuccess {
  readonly ok: true;
  readonly policyId: string;
  readonly policyVersion: string;
  readonly rawInput: string;
  readonly value: string;
}

export interface FieldFailure {
  readonly ok: false;
  readonly policyId: string;
  // Absent only when the policy itself could not be resolved (no version to report).
  readonly policyVersion?: string;
  readonly rawInput: string;
  readonly reason: string;
}

export type FieldResult = FieldSuccess | FieldFailure;

export type FieldPolicyOutcome =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly reason: string };

/**
 * A successfully canonicalized field that RETAINS its raw input and the policy
 * identity+version that produced it. Convenience wrappers return this (or null
 * for a no-op empty input) instead of a bare string so call sites can persist
 * rawInput and policyId@version alongside the canonical value.
 * See CANON-RAW-001 and ratified decision A1.
 */
export interface CanonicalField {
  readonly value: string;
  readonly rawInput: string;
  readonly policyId: string;
  readonly policyVersion: string;
}

/**
 * The ONLY approved way to reduce a canonical field result to its bare value.
 * Calling this deliberately signals that rawInput and policy provenance are
 * being dropped at this site (behavior-preserving plumbing only). The lint
 * guard bans the inline `canonicalizeX(...).value` shortcut precisely so this
 * choke point stays visible and greppable — see CANON-RAW-001 / decision A1.
 */
export function canonicalValue(field: CanonicalField | null): string | null {
  return field === null ? null : field.value;
}

/** Formats the reproducibility stamp `policyId@policyVersion`. */
export function policyStamp(
  field: Pick<CanonicalField, "policyId" | "policyVersion">,
): string {
  return `${field.policyId}@${field.policyVersion}`;
}

/**
 * The persistable provenance triple for a governed field: the verbatim raw input
 * and the policy identity+version that produced the canonical value. Written into
 * field_provenance so a certified value is byte-reproducible. CANON-RAW-001.
 */
export interface FieldProvenanceStamp {
  readonly rawInput: string | null;
  readonly policyId: string | null;
  readonly policyVersion: string | null;
}

/** Extracts the persistable provenance stamp from a canonical field (null-safe). */
export function provenanceStamp(field: CanonicalField | null): FieldProvenanceStamp | null {
  return field === null
    ? null
    : { rawInput: field.rawInput, policyId: field.policyId, policyVersion: field.policyVersion };
}
