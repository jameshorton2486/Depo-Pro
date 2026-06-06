export interface UfmRequiredField {
  metadataKey:
    | "cause_number"
    | "court"
    | "county"
    | "state"
    | "deposition_date"
    | "csr_name"
    | "csr_license"
    | "custodial_attorney";
  fieldPath: string;
  humanName: string;
  ufmSection: string;
}

// TODO(prompt 5C follow-up): migrate readiness/banner required-field semantics to this module.
export const REQUIRED_UFM_FIELDS = [
  {
    metadataKey: "cause_number",
    fieldPath: "caption.case_number",
    humanName: "Cause Number",
    ufmSection: "§3.1d",
  },
  {
    metadataKey: "court",
    fieldPath: "caption.court_name",
    humanName: "Court",
    ufmSection: "§3.1a",
  },
  {
    metadataKey: "county",
    fieldPath: "caption.county",
    humanName: "County",
    ufmSection: "§3.1b",
  },
  {
    metadataKey: "state",
    fieldPath: "session.location_state",
    humanName: "State",
    ufmSection: "§3.1b",
  },
  {
    metadataKey: "deposition_date",
    fieldPath: "session.deposition_date",
    humanName: "Deposition Date",
    ufmSection: "§3.1g",
  },
  {
    metadataKey: "csr_name",
    fieldPath: "reporter.name",
    humanName: "Reporter Name",
    ufmSection: "§3.4",
  },
  {
    metadataKey: "csr_license",
    fieldPath: "reporter.cert_number",
    humanName: "CSR License Number",
    ufmSection: "§3.4",
  },
  {
    metadataKey: "custodial_attorney",
    fieldPath: "proceeding.ordering_contact",
    humanName: "Custodial Attorney Name",
    ufmSection: "§3.4",
  },
] as const satisfies ReadonlyArray<UfmRequiredField>;
