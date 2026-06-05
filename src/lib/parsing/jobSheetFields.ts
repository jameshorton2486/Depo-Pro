const JOB_SHEET_EXACT_FIELD_PATHS = [
  "session.deposition_date",
  "session.start_time",
  "session.location_address",
  "session.location_city",
  "session.location_state",
  "session.location_zip",
  "session.reporting_method",
  "session.is_remote",
  "session.remote_platform",
  "witnesses[0].read_and_sign",
  "proceeding.ordering_firm",
  "proceeding.ordering_contact",
] as const;

const JOB_SHEET_ATTORNEY_FIELDS = [
  "name",
  "firm",
  "address",
  "city",
  "state",
  "zip",
  "phone",
  "email",
] as const;

export const jobSheetFieldPaths = Object.freeze([...JOB_SHEET_EXACT_FIELD_PATHS]);
export const jobSheetAttorneyFields = Object.freeze([...JOB_SHEET_ATTORNEY_FIELDS]);

function isAttorneyJobSheetField(path: string): boolean {
  const match = path.match(/^attorneys\[\d+\]\.([a-z_]+)$/);
  if (!match) {
    return false;
  }

  return jobSheetAttorneyFields.includes(
    match[1] as (typeof JOB_SHEET_ATTORNEY_FIELDS)[number],
  );
}

export function isJobSheetWritableFieldPath(path: string): boolean {
  return jobSheetFieldPaths.includes(path as (typeof JOB_SHEET_EXACT_FIELD_PATHS)[number])
    || isAttorneyJobSheetField(path);
}
