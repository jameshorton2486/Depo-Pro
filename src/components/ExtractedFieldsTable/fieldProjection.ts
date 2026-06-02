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
  confidence_score: number | null;
  conflict: boolean;
  conflictAlternate: { value: string; source: DisplaySource } | null;
  required: boolean;
}

// ─── Source mapping ───────────────────────────────────────────────────────────

function toDisplaySource(s: FieldSource): DisplaySource {
  if (s === "extracted") return "Notice";
  if (s === "imported")  return "Reporter Profile";
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

  let status: FieldStatus;
  if (conflict) {
    status = "Conflict";
  } else if (value === "" && required) {
    status = "Missing";
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
    displaySource: toDisplaySource(source),
    status,
    confidence_score,
    conflict,
    conflictAlternate,
    required,
  };
}

// ─── Projector ────────────────────────────────────────────────────────────────
// Flattens a CaseRecord into a display-ready list of FieldRows.

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
  rows.push(makeRow("caption.case_name",  "Case Caption", "Case Name",    "caption.case_name",  c.case_name.value,  c.case_name.source,  c.case_name.confirmed,  c.case_name.conflict,  c.case_name.confidence_score,  true));
  rows.push(makeRow("caption.case_number","Case Caption", "Case Number",  "caption.case_number",c.case_number.value,c.case_number.source,c.case_number.confirmed,c.case_number.conflict,c.case_number.confidence_score, true));
  rows.push(makeRow("caption.court_name", "Case Caption", "Court Name",   "caption.court_name", c.court_name.value, c.court_name.source, c.court_name.confirmed, c.court_name.conflict, c.court_name.confidence_score,  true));
  rows.push(makeRow("caption.department", "Case Caption", "Department",   "caption.department", c.department.value, c.department.source, c.department.confirmed, c.department.conflict, c.department.confidence_score,  false));
  rows.push(makeRow("caption.judge_name", "Case Caption", "Judge",        "caption.judge_name", c.judge_name.value, c.judge_name.source, c.judge_name.confirmed, c.judge_name.conflict, c.judge_name.confidence_score,  false));

  // ── Session ───────────────────────────────────────────────────────────────
  const s = record.session;
  rows.push(makeRow("session.deposition_date",  "Session", "Deposition Date",    "session.deposition_date",  s.deposition_date.value,  s.deposition_date.source,  s.deposition_date.confirmed,  s.deposition_date.conflict,  s.deposition_date.confidence_score,  true));
  rows.push(makeRow("session.start_time",       "Session", "Start Time",         "session.start_time",       s.start_time.value,       s.start_time.source,       s.start_time.confirmed,       s.start_time.conflict,       s.start_time.confidence_score,       false));
  rows.push(makeRow("session.end_time",         "Session", "End Time",           "session.end_time",         s.end_time.value,         s.end_time.source,         s.end_time.confirmed,         s.end_time.conflict,         s.end_time.confidence_score,         false));
  rows.push(makeRow("session.location_address", "Session", "Address",            "session.location_address", s.location_address.value, s.location_address.source, s.location_address.confirmed, s.location_address.conflict, s.location_address.confidence_score, true));
  rows.push(makeRow("session.location_city",    "Session", "City",               "session.location_city",    s.location_city.value,    s.location_city.source,    s.location_city.confirmed,    s.location_city.conflict,    s.location_city.confidence_score,    true));
  rows.push(makeRow("session.location_state",   "Session", "State",              "session.location_state",   s.location_state.value,   s.location_state.source,   s.location_state.confirmed,   s.location_state.conflict,   s.location_state.confidence_score,   true));
  rows.push(makeRow("session.location_zip",     "Session", "ZIP Code",           "session.location_zip",     s.location_zip.value,     s.location_zip.source,     s.location_zip.confirmed,     s.location_zip.conflict,     s.location_zip.confidence_score,     false));

  // ── Reporter ──────────────────────────────────────────────────────────────
  const r = record.reporter;
  rows.push(makeRow("reporter.name",        "Reporter", "Reporter Name",      "reporter.name",        r.name.value,        r.name.source,        r.name.confirmed,        r.name.conflict,        r.name.confidence_score,        true));
  rows.push(makeRow("reporter.cert_number", "Reporter", "Cert. Number",       "reporter.cert_number", r.cert_number.value, r.cert_number.source, r.cert_number.confirmed, r.cert_number.conflict, r.cert_number.confidence_score, true));
  rows.push(makeRow("reporter.cert_state",  "Reporter", "Cert. State",        "reporter.cert_state",  r.cert_state.value,  r.cert_state.source,  r.cert_state.confirmed,  r.cert_state.conflict,  r.cert_state.confidence_score,  true));
  rows.push(makeRow("reporter.firm",        "Reporter", "Reporting Firm",     "reporter.firm",        r.firm.value,        r.firm.source,        r.firm.confirmed,        r.firm.conflict,        r.firm.confidence_score,        false));

  // ── Witnesses ─────────────────────────────────────────────────────────────
  record.witnesses.forEach((w, i) => {
    const pfx = `witnesses[${i}]`;
    rows.push(makeRow(`${pfx}.name`,     "Witness", `Witness ${i + 1} — Name`,     `${pfx}.name`,     w.name.value,     w.name.source,     w.name.confirmed,     w.name.conflict,     w.name.confidence_score,     true,  alt(`${pfx}.name`)));
    rows.push(makeRow(`${pfx}.role`,     "Witness", `Witness ${i + 1} — Role`,     `${pfx}.role`,     w.role.value,     w.role.source,     w.role.confirmed,     w.role.conflict,     w.role.confidence_score,     true,  alt(`${pfx}.role`)));
    rows.push(makeRow(`${pfx}.title`,    "Witness", `Witness ${i + 1} — Title`,    `${pfx}.title`,    w.title.value,    w.title.source,    w.title.confirmed,    w.title.conflict,    w.title.confidence_score,    false, alt(`${pfx}.title`)));
    rows.push(makeRow(`${pfx}.employer`, "Witness", `Witness ${i + 1} — Employer`, `${pfx}.employer`, w.employer.value, w.employer.source, w.employer.confirmed, w.employer.conflict, w.employer.confidence_score, false, alt(`${pfx}.employer`)));
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
