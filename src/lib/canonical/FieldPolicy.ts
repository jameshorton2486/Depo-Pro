import type { FieldKind } from "./FieldKinds";
import type { FieldPolicyOutcome } from "./FieldResult";

export interface FieldValidationIssue {
  readonly code: string;
  readonly message: string;
}

export interface FieldPolicyHooks {
  readonly normalize: (rawInput: string) => FieldPolicyOutcome;
  readonly validate?: (canonicalValue: string) => readonly FieldValidationIssue[];
  readonly toDisplay?: (canonicalValue: string) => string;
  readonly isConfirmationEligible?: (canonicalValue: string) => boolean;
}

export interface FieldConsumerMetadata {
  readonly consumers: readonly string[];
  readonly sourceOwner?: string;
}

/** Describes one versioned field rule without binding it to an application consumer. */
export interface FieldPolicy {
  readonly id: string;
  readonly version: string;
  readonly kind: FieldKind;
  readonly hooks: FieldPolicyHooks;
  readonly downstream: FieldConsumerMetadata;
}
