import type { FieldPolicy } from "./FieldPolicy.ts";

export class DuplicateFieldPolicyError extends Error {
  constructor(policyId: string) {
    super(`Field policy already registered: ${policyId}`);
    this.name = "DuplicateFieldPolicyError";
  }
}

/** Owns policy identity and lookup without creating application-global state. */
export class FieldRegistry {
  readonly #policies = new Map<string, FieldPolicy>();

  register(policy: FieldPolicy): void {
    if (this.#policies.has(policy.id)) {
      throw new DuplicateFieldPolicyError(policy.id);
    }

    this.#policies.set(policy.id, policy);
  }

  get(policyId: string): FieldPolicy | undefined {
    return this.#policies.get(policyId);
  }
}
