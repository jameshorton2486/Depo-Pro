import type { FieldRegistry } from "./FieldRegistry";
import type { FieldResult } from "./FieldResult";

/** Executes an explicitly selected policy while preserving input and policy provenance. */
export function formatCanonicalField(
  registry: FieldRegistry,
  policyId: string,
  rawInput: string,
): FieldResult {
  const policy = registry.get(policyId);

  if (!policy) {
    return {
      ok: false,
      policyId,
      rawInput,
      reason: `Field policy not found: ${policyId}`,
    };
  }

  const outcome = policy.hooks.normalize(rawInput);

  if (!outcome.ok) {
    return {
      ok: false,
      policyId,
      rawInput,
      reason: outcome.reason,
    };
  }

  return {
    ok: true,
    policyId,
    rawInput,
    value: outcome.value,
  };
}
