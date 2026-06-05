import type { CaseRecord, FieldSource } from "../../types/case";

// ─── Row model ────────────────────────────────────────────────────────────────

export type FieldCategory =
  | "Case Caption"
  | "Session"
  | "Reporter"
  | "Witness"
  | "Attorney"
  | "Interpreter"
  | "Videographer"
  | "Participant";

export type FieldStatus = "Missing" | "Needs Confirmation" | "Confirmed" | "Conflict";

export type DisplaySource =
  | "Notice"
  | "Job Sheet"
  | "Reporter Profile"
  | "Record"
  | "Computed"
  | "Manual";

export interface FieldRow {
  id: string;                   // unique key for React
  category: FieldCategory;
  label: string;
  path: string;                 // dot-path into CaseRecord (informational)
  value: string;                // display value (empty string if null/missing)
  rawValue: unknown;
  source: FieldSource;
  displaySource: DisplaySource;
  status: FieldStatus;
  conflict: boolean;
  conflictAlternate: { value: string; source: DisplaySource } | null;
  confidence_score: number | null;
  required: boolean;
}

// ─── Source mapping ───────────────────────────────────────────────────────────
// "extracted" can mean either Notice or Job Sheet depending on the field path.
// Job Sheet fields are identified by an explicit override map.

const JOB_SHEET_PATHS = new Set([
  "session.location_address",
  "session.location_city",
  "session.location_county",
  "session.location_state",
  "session.location_zip",
  "session.start_time",
  "session.end_time",
  "session.reporting_method",
]);

function toDisplaySource(s: FieldSource, path: string): DisplaySource {
  if (s === "extracted") {
    return JOB_SHEET_PATHS.has(path) ? "Job Sheet" : "Notice";
  }
  if (s === "imported") return "Reporter Profile";
  return "Manual";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRow(
  id: string,
  category: FieldCategory,
  label: string,
  path: string,
  rawValue: unknown,
  source: FieldSource,
  confirmed: boolean,
  conflict: boolean,
  confidence_score: number | null,
  required: boolean,
  conflictAlternate: FieldRow["conflictAlternate"] = null,
): FieldRow {
  const value = rawValue == null || rawValue === "" ? "" : String(rawValue);
  const displaySource = toDisplaySource(source, path);

  let status: FieldStatus;
  if (conflict) {
    status = "Conflict";
  } else if (value === "" && required) {
    status = "Missing";
  } else if (value === "") {
    status = "Needs Confirmation";
  } else if (confirmed) {
    status = "Confirmed";
  } else {
    status = "Needs Confirmation";
  }

  return {
    id,
    category,
    label,
    path,
    value,
    rawValue,
    source,
    displaySource,
    status,
    conflict,
    conflictAlternate,
    confidence_score,
    required,
  };
}

// ─── Projector ────────────────────────────────────────────────────────────────

export function projectFieldRows(
  record: CaseRecord,
  conflictAlternates: Record<string, { value: string; source: string }> = {},
): FieldRow[] {
  const rows: FieldRow[] = [];

  const alt = (key: string): FieldRow["conflictAlternate"] => {
    const a = conflictAlternates[key];
    if (!a) return null;
    return { value: a.value, source: a.source as DisplaySource };
  };

  // ── Case Caption ─────────────────────────────────────────────────────────
  const c = record.caption;
  rows.push(makeRow("caption.case_name",   "Case Caption", "Case Name",   "caption.case_name",   c.case_name.value,   c.case_name.source,   c.case_name.confirmed,   c.case_name.conflict,   c.case_name.confidence_score,   true));
  rows.push(makeRow("caption.case_style",  "Case Caption", "Case Style",  "caption.case_style",  c.case_style.value,  c.case_style.source,  c.case_style.confirmed,  c.case_style.conflict,  c.case_style.confidence_score,  true));
  rows.push(makeRow("caption.case_number", "Case Caption", "Case Number", "caption.case_number", c.case_number.value, c.case_number.source, c.case_number.confirmed, c.case_number.conflict, c.case_number.confidence_score, true));
  rows.push(makeRow("caption.court_name",  "Case Caption", "Court Name",  "caption.court_name",  c.court_name.value,  c.court_name.source,  c.court_name.confirmed,  c.court_name.conflict,  c.court_name.confidence_score,  true));
  rows.push(makeRow("caption.county",      "Case Caption", "County",      "caption.county",      c.county.value,      c.county.source,      c.county.confirmed,      c.county.conflict,      c.county.confidence_score,      true));
  rows.push(makeRow("caption.venue",       "Case Caption", "Venue",       "caption.venue",       c.venue.value,       c.venue.source,       c.venue.confirmed,       c.venue.conflict,       c.venue.confidence_score,       true));
  rows.push(makeRow("caption.department",  "Case Caption", "Department",  "caption.department",  c.department.value,  c.department.source,  c.department.confirmed,  c.department.conflict,  c.department.confidence_score,  false));
  rows.push(makeRow("caption.judge_name",  "Case Caption", "Judge",       "caption.judge_name",  c.judge_name.value,  c.judge_name.source,  c.judge_name.confirmed,  c.judge_name.conflict,  c.judge_name.confidence_score,  false));

  // ── Session ───────────────────────────────────────────────────────────────
  const s = record.session;
  rows.push(makeRow("session.deposition_date",  "Session", "Deposition Date",    "session.deposition_date",  s.deposition_date.value,  s.deposition_date.source,  s.deposition_date.confirmed,  s.deposition_date.conflict,  s.deposition_date.confidence_score,  true));
  rows.push(makeRow("session.start_time",       "Session", "Start Time",         "session.start_time",       s.start_time.value,       s.start_time.source,       s.start_time.confirmed,       s.start_time.conflict,       s.start_time.confidence_score,       false));
  rows.push(makeRow("session.end_time",         "Session", "End Time",           "session.end_time",         s.end_time.value,         s.end_time.source,         s.end_time.confirmed,         s.end_time.conflict,         s.end_time.confidence_score,         false));
  rows.push(makeRow("session.location_address", "Session", "Address",            "session.location_address", s.location_address.value, s.location_address.source, s.location_address.confirmed, s.location_address.conflict, s.location_address.confidence_score, true));
  rows.push(makeRow("session.location_city",    "Session", "City",               "session.location_city",    s.location_city.value,    s.location_city.source,    s.location_city.confirmed,    s.location_city.conflict,    s.location_city.confidence_score,    true));
  rows.push(makeRow("session.location_county",  "Session", "County",             "session.location_county",  s.location_county.value,  s.location_county.source,  s.location_county.confirmed,  s.location_county.conflict,  s.location_county.confidence_score,  true));
  rows.push(makeRow("session.location_state",   "Session", "State",              "session.location_state",   s.location_state.value,   s.location_state.source,   s.location_state.confirmed,   s.location_state.conflict,   s.location_state.confidence_score,   true));
  rows.push(makeRow("session.location_zip",     "Session", "ZIP Code",           "session.location_zip",     s.location_zip.value,     s.location_zip.source,     s.location_zip.confirmed,     s.location_zip.conflict,     s.location_zip.confidence_score,     false));
  rows.push(makeRow("session.reporting_method", "Session", "Reporting Method",   "session.reporting_method", s.reporting_method.value, s.reporting_method.source, s.reporting_method.confirmed, s.reporting_method.conflict, s.reporting_method.confidence_score, true));
  rows.push(makeRow("session.is_remote",        "Session", "Remote Proceeding",  "session.is_remote",        s.is_remote ? "Yes" : "No", "manual", false, false, null, false));
  rows.push(makeRow("session.remote_platform",  "Session", "Remote Platform",    "session.remote_platform",  s.remote_platform, "manual", false, false, null, false));

  // ── Reporter ──────────────────────────────────────────────────────────────
  const rep = record.reporter;
  rows.push(makeRow("reporter.name",        "Reporter", "Reporter Name",  "reporter.name",        rep.name.value,        rep.name.source,        rep.name.confirmed,        rep.name.conflict,        rep.name.confidence_score,        true));
  rows.push(makeRow("reporter.cert_number", "Reporter", "Cert. Number",   "reporter.cert_number", rep.cert_number.value, rep.cert_number.source, rep.cert_number.confirmed, rep.cert_number.conflict, rep.cert_number.confidence_score, true));
  rows.push(makeRow("reporter.cert_state",  "Reporter", "Cert. State",    "reporter.cert_state",  rep.cert_state.value,  rep.cert_state.source,  rep.cert_state.confirmed,  rep.cert_state.conflict,  rep.cert_state.confidence_score,  true));
  rows.push(makeRow("reporter.firm",        "Reporter", "Reporting Firm", "reporter.firm",        rep.firm.value,        rep.firm.source,        rep.firm.confirmed,        rep.firm.conflict,        rep.firm.confidence_score,        false));
  rows.push(makeRow("reporter.license_expiration",       "Reporter", "License Expiration",       "reporter.license_expiration",       rep.license_expiration.value,       rep.license_expiration.source,       rep.license_expiration.confirmed,       rep.license_expiration.conflict,       rep.license_expiration.confidence_score,       false));
  rows.push(makeRow("reporter.firm_registration_number", "Reporter", "Firm Registration No.",    "reporter.firm_registration_number", rep.firm_registration_number.value, rep.firm_registration_number.source, rep.firm_registration_number.confirmed, rep.firm_registration_number.conflict, rep.firm_registration_number.confidence_score, false));
  rows.push(makeRow("reporter.firm_address",             "Reporter", "Firm Address",             "reporter.firm_address",             rep.firm_address.value,             rep.firm_address.source,             rep.firm_address.confirmed,             rep.firm_address.conflict,             rep.firm_address.confidence_score,             false));

  // ── Witnesses ─────────────────────────────────────────────────────────────
  record.witnesses.forEach((w, i) => {
    const pfx = `witnesses[${i}]`;
    rows.push(makeRow(`${pfx}.name`,     "Witness", `Witness ${i + 1} — Name`,     `${pfx}.name`,     w.name.value,     w.name.source,     w.name.confirmed,     w.name.conflict,     w.name.confidence_score,     true,  alt(`${pfx}.name`)));
    rows.push(makeRow(`${pfx}.role`,     "Witness", `Witness ${i + 1} — Role`,     `${pfx}.role`,     w.role.value,     w.role.source,     w.role.confirmed,     w.role.conflict,     w.role.confidence_score,     true,  alt(`${pfx}.role`)));
    rows.push(makeRow(`${pfx}.title`,    "Witness", `Witness ${i + 1} — Title`,    `${pfx}.title`,    w.title.value,    w.title.source,    w.title.confirmed,    w.title.conflict,    w.title.confidence_score,    false, alt(`${pfx}.title`)));
    rows.push(makeRow(`${pfx}.employer`, "Witness", `Witness ${i + 1} — Employer`, `${pfx}.employer`, w.employer.value, w.employer.source, w.employer.confirmed, w.employer.conflict, w.employer.confidence_score, false, alt(`${pfx}.employer`)));
    rows.push(makeRow(`${pfx}.party_affiliation`, "Witness", `Witness ${i + 1} — Party Affiliation`, `${pfx}.party_affiliation`, w.party_affiliation.value, w.party_affiliation.source, w.party_affiliation.confirmed, w.party_affiliation.conflict, w.party_affiliation.confidence_score, false));
    rows.push(makeRow(`${pfx}.read_and_sign`, "Witness", `Witness ${i + 1} — Read & Sign`, `${pfx}.read_and_sign`, w.read_and_sign.value, w.read_and_sign.source, w.read_and_sign.confirmed, w.read_and_sign.conflict, w.read_and_sign.confidence_score, false));
  });

  // ── Attorneys ─────────────────────────────────────────────────────────────
  record.attorneys.forEach((a, i) => {
    const pfx = `attorneys[${i}]`;
    rows.push(makeRow(`${pfx}.name`,         "Attorney", `Attorney ${i + 1} — Name`,         `${pfx}.name`,         a.name.value,         a.name.source,         a.name.confirmed,         a.name.conflict,         a.name.confidence_score,         true,  alt(`${pfx}.name`)));
    rows.push(makeRow(`${pfx}.firm`,         "Attorney", `Attorney ${i + 1} — Firm`,         `${pfx}.firm`,         a.firm.value,         a.firm.source,         a.firm.confirmed,         a.firm.conflict,         a.firm.confidence_score,         false, alt(`${pfx}.firm`)));
    rows.push(makeRow(`${pfx}.role`,         "Attorney", `Attorney ${i + 1} — Role`,         `${pfx}.role`,         a.role.value,         a.role.source,         a.role.confirmed,         a.role.conflict,         a.role.confidence_score,         true,  alt(`${pfx}.role`)));
    rows.push(makeRow(`${pfx}.representing`, "Attorney", `Attorney ${i + 1} — Representing`, `${pfx}.representing`, a.representing.value, a.representing.source, a.representing.confirmed, a.representing.conflict, a.representing.confidence_score, false, alt(`${pfx}.representing`)));
    rows.push(makeRow(`${pfx}.bar_number`,   "Attorney", `Attorney ${i + 1} — Bar No.`,      `${pfx}.bar_number`,   a.bar_number.value,   a.bar_number.source,   a.bar_number.confirmed,   a.bar_number.conflict,   a.bar_number.confidence_score,   false, alt(`${pfx}.bar_number`)));
  });

  // ── Interpreters ──────────────────────────────────────────────────────────
  record.interpreters.forEach((interp, i) => {
    const pfx = `interpreters[${i}]`;
    rows.push(makeRow(`${pfx}.name`, "Interpreter", `Interpreter ${i + 1} — Name`, `${pfx}.name`, interp.name.value, interp.name.source, interp.name.confirmed, interp.name.conflict, interp.name.confidence_score, true, alt(`${pfx}.name`)));
  });

  // ── Videographers ─────────────────────────────────────────────────────────
  record.videographers.forEach((vid, i) => {
    const pfx = `videographers[${i}]`;
    rows.push(makeRow(`${pfx}.name`, "Videographer", `Videographer ${i + 1} — Name`, `${pfx}.name`, vid.name.value, vid.name.source, vid.name.confirmed, vid.name.conflict, vid.name.confidence_score, false, alt(`${pfx}.name`)));
    rows.push(makeRow(`${pfx}.firm`, "Videographer", `Videographer ${i + 1} — Firm`, `${pfx}.firm`, vid.firm.value, vid.firm.source, vid.firm.confirmed, vid.firm.conflict, vid.firm.confidence_score, false, alt(`${pfx}.firm`)));
  });

  return rows;
}
