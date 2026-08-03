export interface FieldSuccess {
  readonly ok: true;
  readonly policyId: string;
  readonly rawInput: string;
  readonly value: string;
}

export interface FieldFailure {
  readonly ok: false;
  readonly policyId: string;
  readonly rawInput: string;
  readonly reason: string;
}

export type FieldResult = FieldSuccess | FieldFailure;

export type FieldPolicyOutcome =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly reason: string };
