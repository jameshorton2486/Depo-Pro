import { FieldRegistry } from "./FieldRegistry";
import type { FieldPolicy } from "./FieldPolicy";

export const CAUSE_NUMBER_POLICY_ID = "caption.case_number";
export const CAUSE_NUMBER_POLICY_VERSION = "1.0.0";

export const CAUSE_NUMBER_POLICY: FieldPolicy = {
  id: CAUSE_NUMBER_POLICY_ID,
  version: CAUSE_NUMBER_POLICY_VERSION,
  kind: "cause_number",
  hooks: {
    normalize: (rawInput) => {
      const trimmed = rawInput.trim();
      if (!trimmed) {
        return { ok: false, reason: "Cause number is empty" };
      }

      return {
        ok: true,
        value: trimmed.replace(/[a-z]/g, (character) => character.toUpperCase()),
      };
    },
  },
  downstream: {
    consumers: ["intake.extraction"],
    sourceOwner: "NOD",
  },
};

export function createCauseNumberRegistry(): FieldRegistry {
  const registry = new FieldRegistry();
  registry.register(CAUSE_NUMBER_POLICY);
  return registry;
}
