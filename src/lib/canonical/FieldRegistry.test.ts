import { describe, expect, it } from "vitest";

import { formatCanonicalField } from "./CanonicalFormatter";
import { FIELD_KIND_CATALOG, FIELD_KINDS, type FieldKind } from "./FieldKinds";
import type { FieldPolicy } from "./FieldPolicy";
import { DuplicateFieldPolicyError, FieldRegistry } from "./FieldRegistry";

function createPolicy(
  id: string,
  kind: FieldKind = "cause_number",
  normalize: FieldPolicy["hooks"]["normalize"] = (rawInput) => ({
    ok: true,
    value: rawInput,
  }),
): FieldPolicy {
  return {
    id,
    version: "1.0.0-test",
    kind,
    hooks: { normalize },
    downstream: { consumers: [] },
  };
}

describe("canonical field kinds", () => {
  it("defines the complete closed field-kind catalog", () => {
    expect(FIELD_KINDS).toEqual([
      "cause_number",
      "phone_number",
      "email",
      "person_name",
      "organization",
      "court",
      "address",
      "date",
      "time",
      "caption",
    ]);
    expect(FIELD_KIND_CATALOG.map(({ kind }) => kind)).toEqual(FIELD_KINDS);
  });
});

describe("FieldRegistry", () => {
  it("registers and retrieves a policy by stable identity", () => {
    const registry = new FieldRegistry();
    const policy = createPolicy("caption.case_number");

    registry.register(policy);

    expect(registry.get(policy.id)).toBe(policy);
  });

  it("retrieves the same policies regardless of registration order", () => {
    const first = createPolicy("caption.case_number");
    const second = createPolicy("session.start_time", "time");
    const forward = new FieldRegistry();
    const reverse = new FieldRegistry();

    forward.register(first);
    forward.register(second);
    reverse.register(second);
    reverse.register(first);

    expect(forward.get(first.id)).toBe(reverse.get(first.id));
    expect(forward.get(second.id)).toBe(reverse.get(second.id));
  });

  it("rejects duplicate policy identities explicitly", () => {
    const registry = new FieldRegistry();
    registry.register(createPolicy("caption.case_number"));

    expect(() => registry.register(createPolicy("caption.case_number"))).toThrow(
      DuplicateFieldPolicyError,
    );
  });

  it("keeps separate registry instances isolated", () => {
    const populated = new FieldRegistry();
    const empty = new FieldRegistry();
    populated.register(createPolicy("caption.case_number"));

    expect(populated.get("caption.case_number")).toBeDefined();
    expect(empty.get("caption.case_number")).toBeUndefined();
  });

  it("accepts a new policy without registry implementation changes", () => {
    const registry = new FieldRegistry();
    const policy = createPolicy("case.secondary_email", "email");

    registry.register(policy);

    expect(registry.get(policy.id)).toBe(policy);
  });
});

describe("formatCanonicalField", () => {
  it("returns an explicit missing-policy failure", () => {
    const result = formatCanonicalField(
      new FieldRegistry(),
      "caption.case_number",
      "SYNTHETIC-001",
    );

    expect(result).toEqual({
      ok: false,
      policyId: "caption.case_number",
      rawInput: "SYNTHETIC-001",
      reason: "Field policy not found: caption.case_number",
    });
  });

  it("preserves raw input and policy identity on success", () => {
    const registry = new FieldRegistry();
    registry.register(
      createPolicy("caption.case_number", "cause_number", () => ({
        ok: true,
        value: "SYNTHETIC-001",
      })),
    );

    expect(
      formatCanonicalField(registry, "caption.case_number", " synthetic-001 "),
    ).toEqual({
      ok: true,
      policyId: "caption.case_number",
      policyVersion: "1.0.0-test",
      rawInput: " synthetic-001 ",
      value: "SYNTHETIC-001",
    });
  });

  it("preserves raw input, policy identity, and reason on failure", () => {
    const registry = new FieldRegistry();
    registry.register(
      createPolicy("caption.case_number", "cause_number", () => ({
        ok: false,
        reason: "Synthetic value rejected",
      })),
    );

    expect(formatCanonicalField(registry, "caption.case_number", "INVALID")).toEqual({
      ok: false,
      policyId: "caption.case_number",
      policyVersion: "1.0.0-test",
      rawInput: "INVALID",
      reason: "Synthetic value rejected",
    });
  });
});
