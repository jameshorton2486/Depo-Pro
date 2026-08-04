import { formatCanonicalField } from "./CanonicalFormatter";
import { FieldRegistry } from "./FieldRegistry";
import type { FieldPolicy } from "./FieldPolicy";
import type { CanonicalField } from "./FieldResult";

export const PHONE_NUMBER_POLICY_ID = "intake.phone_number";
export const PHONE_NUMBER_POLICY_VERSION = "1.0.0";

const EXTENSION_PATTERN = /\s*(?:ext(?:ension)?\.?|x)\s*(\d+)\s*$/i;

function formatNanp(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export const PHONE_NUMBER_POLICY: FieldPolicy = {
  id: PHONE_NUMBER_POLICY_ID,
  version: PHONE_NUMBER_POLICY_VERSION,
  kind: "phone_number",
  hooks: {
    normalize: (rawInput) => {
      const trimmed = rawInput.trim();
      if (!trimmed) {
        return { ok: false, reason: "Phone number is empty" };
      }

      const extensionMatch = trimmed.match(EXTENSION_PATTERN);
      const extension = extensionMatch?.[1] ?? null;
      const base = extensionMatch
        ? trimmed.slice(0, extensionMatch.index).trim()
        : trimmed;
      const compact = base.replace(/[\s().-]/g, "");

      let canonicalBase: string;
      if (/^\d{10}$/.test(compact)) {
        canonicalBase = formatNanp(compact);
      } else if (/^1\d{10}$/.test(compact)) {
        canonicalBase = formatNanp(compact.slice(1));
      } else if (/^\+1\d{10}$/.test(compact)) {
        canonicalBase = formatNanp(compact.slice(2));
      } else if (/^\+[2-9]\d{7,14}$/.test(compact)) {
        canonicalBase = compact;
      } else {
        return { ok: false, reason: "Phone number is not a valid NANP or E.164 value" };
      }

      return {
        ok: true,
        value: extension ? `${canonicalBase} ext. ${extension}` : canonicalBase,
      };
    },
  },
  downstream: {
    consumers: ["intake.phone-writers"],
    sourceOwner: "Intake",
  },
};

export function createPhoneNumberRegistry(): FieldRegistry {
  const registry = new FieldRegistry();
  registry.register(PHONE_NUMBER_POLICY);
  return registry;
}

export function canonicalizePhoneNumber(
  rawInput: string | null | undefined,
): CanonicalField | null {
  if (rawInput == null || !rawInput.trim()) {
    return null;
  }

  const result = formatCanonicalField(
    createPhoneNumberRegistry(),
    PHONE_NUMBER_POLICY_ID,
    rawInput,
  );
  if (!result.ok) {
    throw new Error(`Phone Number canonicalization failed: ${result.reason}`);
  }

  return {
    value: result.value,
    rawInput: result.rawInput,
    policyId: result.policyId,
    policyVersion: result.policyVersion,
  };
}
