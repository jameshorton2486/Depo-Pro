import { formatCanonicalField } from "./CanonicalFormatter";
import { FieldRegistry } from "./FieldRegistry";
import type { FieldKind } from "./FieldKinds";
import type { FieldPolicy } from "./FieldPolicy";

export const PERSON_NAME_POLICY_ID = "intake.person_name";
export const ORGANIZATION_POLICY_ID = "intake.organization";
export const COURT_POLICY_ID = "caption.court_name";
export const NAME_POLICY_VERSION = "1.0.0";

const SUFFIXES = new Map([
  ["JR", "Jr."], ["JR.", "Jr."], ["SR", "Sr."], ["SR.", "Sr."],
  ["II", "II"], ["III", "III"], ["IV", "IV"],
]);
const ENTITY_SUFFIXES = new Map([
  ["LLC", "LLC"], ["PLLC", "PLLC"], ["P.C.", "P.C."], ["PC", "P.C."],
  ["LLP", "LLP"], ["L.L.P.", "L.L.P."], ["INC.", "Inc."], ["INC", "Inc."],
]);
const COURT_CONNECTORS = new Set(["for", "the", "of", "and", "in"]);

function collapse(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isUniformCase(value: string): boolean {
  const letters = value.replace(/[^A-Za-z]/g, "");
  return Boolean(letters) && (letters === letters.toUpperCase() || letters === letters.toLowerCase());
}

function titleWord(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function policy(id: string, kind: FieldKind, normalize: (value: string) => string): FieldPolicy {
  return {
    id, version: NAME_POLICY_VERSION, kind,
    hooks: {
      normalize: (rawInput) => {
        const trimmed = collapse(rawInput);
        return trimmed ? { ok: true, value: normalize(trimmed) } : { ok: false, reason: `${kind} is empty` };
      },
    },
    downstream: { consumers: ["intake.name-writers"], sourceOwner: "Intake" },
  };
}

export const PERSON_NAME_POLICY = policy(PERSON_NAME_POLICY_ID, "person_name", (value) => {
  if (!isUniformCase(value) || /['-]/.test(value)) return value;
  return value.split(" ").map((word) => {
    const upper = word.toUpperCase();
    if (SUFFIXES.has(upper)) return SUFFIXES.get(upper)!;
    if (/^[A-Z]\.$/i.test(word)) return upper;
    return /^[A-Za-z]+$/.test(word) ? titleWord(word) : word;
  }).join(" ");
});

export const ORGANIZATION_POLICY = policy(ORGANIZATION_POLICY_ID, "organization", (value) => {
  if (!isUniformCase(value)) return value;
  return value.split(" ").map((word) => {
    const upper = word.toUpperCase();
    if (ENTITY_SUFFIXES.has(upper)) return ENTITY_SUFFIXES.get(upper)!;
    if (word === "&") return word;
    const match = word.match(/^([A-Za-z]+)([,.]?)$/);
    return match ? `${titleWord(match[1])}${match[2]}` : word;
  }).join(" ");
});

export const COURT_POLICY = policy(COURT_POLICY_ID, "court", (value) => {
  if (!isUniformCase(value)) return value;
  return value.split(" ").map((word, index) => {
    const match = word.match(/^([A-Za-z]+)([,.]?)$/);
    if (!match) return word;
    const lower = match[1].toLowerCase();
    const normalized = index > 0 && COURT_CONNECTORS.has(lower) ? lower : titleWord(lower);
    return `${normalized}${match[2]}`;
  }).join(" ");
});

export function canonicalizeGovernedName(
  policyId: string,
  value: string | null | undefined,
): string | null {
  if (value == null || !value.trim()) return value ?? null;
  const registry = new FieldRegistry();
  registry.register(PERSON_NAME_POLICY);
  registry.register(ORGANIZATION_POLICY);
  registry.register(COURT_POLICY);
  const result = formatCanonicalField(registry, policyId, value);
  if (!result.ok) throw new Error(`Name canonicalization failed: ${result.reason}`);
  return result.value;
}
