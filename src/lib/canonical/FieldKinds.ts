export const FIELD_KINDS = [
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
] as const;

export type FieldKind = (typeof FIELD_KINDS)[number];

export interface FieldKindDefinition {
  readonly kind: FieldKind;
  readonly label: string;
}

export const FIELD_KIND_CATALOG: readonly FieldKindDefinition[] = [
  { kind: "cause_number", label: "Cause Number" },
  { kind: "phone_number", label: "Phone Number" },
  { kind: "email", label: "Email" },
  { kind: "person_name", label: "Person Name" },
  { kind: "organization", label: "Organization" },
  { kind: "court", label: "Court" },
  { kind: "address", label: "Address" },
  { kind: "date", label: "Date" },
  { kind: "time", label: "Time" },
  { kind: "caption", label: "Caption" },
];
