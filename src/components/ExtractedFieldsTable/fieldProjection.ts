import type { CaseRecord, FieldSource } from "../../types/case";

// ─── Row model ────────────────────────────────────────────────────────────────

export type FieldCategory =
  | "Case Caption"
  | "Party"
  | "Law Firm"
  | "Session"
  | "Scheduling"
  | "Service"
  | "Court Reporter"
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
  "session.location_type",
  "session.location_address",
  "session.location_city",
  "session.location_county",
  "session.location_state",
  "session.location_zip",
  "session.start_time",
  "session.end_time",
  "session.reporting_method",
]);

function formatLocationType(value: CaseRecord["session"]["location_type"]["value"]): string {
  switch (value) {
    case "zoom":
      return "Zoom";
    case "in_person":
      return "In Person";
    case "hybrid":
      return "Hybrid";
    case "phone":
      return "Phone";
    default:
      return "";
  }
}

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
  const parties = Array.isArray(record.parties) ? record.parties : [];
  const lawFirms = Array.isArray(record.law_firms) ? record.law_firms : [];
  const witnesses = Array.isArray(record.witnesses) ? record.witnesses : [];
  const attorneys = Array.isArray(record.attorneys) ? record.attorneys : [];
  const interpreters = Array.isArray(record.interpreters) ? record.interpreters : [];
  const videographers = Array.isArray(record.videographers) ? record.videographers : [];

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
  rows.push(makeRow("caption.judicial_district", "Case Caption", "Judicial District", "caption.judicial_district", c.judicial_district.value, c.judicial_district.source, c.judicial_district.confirmed, c.judicial_district.conflict, c.judicial_district.confidence_score, false));
  rows.push(makeRow("caption.division",    "Case Caption", "Division",    "caption.division",    c.division.value,    c.division.source,    c.division.confirmed,    c.division.conflict,    c.division.confidence_score,    false));
  rows.push(makeRow("caption.county",      "Case Caption", "County",      "caption.county",      c.county.value,      c.county.source,      c.county.confirmed,      c.county.conflict,      c.county.confidence_score,      true));
  rows.push(makeRow("caption.state",       "Case Caption", "State",       "caption.state",       c.state.value,       c.state.source,       c.state.confirmed,       c.state.conflict,       c.state.confidence_score,       true));
  rows.push(makeRow("caption.jurisdiction_type", "Case Caption", "Jurisdiction Type", "caption.jurisdiction_type", c.jurisdiction_type.value, c.jurisdiction_type.source, c.jurisdiction_type.confirmed, c.jurisdiction_type.conflict, c.jurisdiction_type.confidence_score, false));
  rows.push(makeRow("caption.venue",       "Case Caption", "Venue",       "caption.venue",       c.venue.value,       c.venue.source,       c.venue.confirmed,       c.venue.conflict,       c.venue.confidence_score,       true));
  rows.push(makeRow("caption.department",  "Case Caption", "Department",  "caption.department",  c.department.value,  c.department.source,  c.department.confirmed,  c.department.conflict,  c.department.confidence_score,  false));
  rows.push(makeRow("caption.judge_name",  "Case Caption", "Judge",       "caption.judge_name",  c.judge_name.value,  c.judge_name.source,  c.judge_name.confirmed,  c.judge_name.conflict,  c.judge_name.confidence_score,  false));

  parties.forEach((party, i) => {
    const pfx = `parties[${i}]`;
    rows.push(makeRow(`${pfx}.name`, "Party", `Party ${i + 1} — Name`, `${pfx}.name`, party.name.value, party.name.source, party.name.confirmed, party.name.conflict, party.name.confidence_score, true, alt(`${pfx}.name`)));
    rows.push(makeRow(`${pfx}.role`, "Party", `Party ${i + 1} — Role`, `${pfx}.role`, party.role.value, party.role.source, party.role.confirmed, party.role.conflict, party.role.confidence_score, true, alt(`${pfx}.role`)));
    rows.push(makeRow(`${pfx}.role_modifier`, "Party", `Party ${i + 1} — Role Modifier`, `${pfx}.role_modifier`, party.role_modifier.value, party.role_modifier.source, party.role_modifier.confirmed, party.role_modifier.conflict, party.role_modifier.confidence_score, false, alt(`${pfx}.role_modifier`)));
    rows.push(makeRow(`${pfx}.entity_type`, "Party", `Party ${i + 1} — Entity Type`, `${pfx}.entity_type`, party.entity_type.value, party.entity_type.source, party.entity_type.confirmed, party.entity_type.conflict, party.entity_type.confidence_score, false, alt(`${pfx}.entity_type`)));
    rows.push(makeRow(`${pfx}.fka_or_dba`, "Party", `Party ${i + 1} — FKA / DBA`, `${pfx}.fka_or_dba`, party.fka_or_dba.value, party.fka_or_dba.source, party.fka_or_dba.confirmed, party.fka_or_dba.conflict, party.fka_or_dba.confidence_score, false, alt(`${pfx}.fka_or_dba`)));
  });

  lawFirms.forEach((lawFirm, i) => {
    const pfx = `law_firms[${i}]`;
    rows.push(makeRow(`${pfx}.name`, "Law Firm", `Firm ${i + 1} — Name`, `${pfx}.name`, lawFirm.name.value, lawFirm.name.source, lawFirm.name.confirmed, lawFirm.name.conflict, lawFirm.name.confidence_score, true, alt(`${pfx}.name`)));
    rows.push(makeRow(`${pfx}.represented_party`, "Law Firm", `Firm ${i + 1} — Represents`, `${pfx}.represented_party`, lawFirm.represented_party.value, lawFirm.represented_party.source, lawFirm.represented_party.confirmed, lawFirm.represented_party.conflict, lawFirm.represented_party.confidence_score, false, alt(`${pfx}.represented_party`)));
    rows.push(makeRow(`${pfx}.address`, "Law Firm", `Firm ${i + 1} — Address`, `${pfx}.address`, lawFirm.address.value, lawFirm.address.source, lawFirm.address.confirmed, lawFirm.address.conflict, lawFirm.address.confidence_score, false, alt(`${pfx}.address`)));
    rows.push(makeRow(`${pfx}.city`, "Law Firm", `Firm ${i + 1} — City`, `${pfx}.city`, lawFirm.city.value, lawFirm.city.source, lawFirm.city.confirmed, lawFirm.city.conflict, lawFirm.city.confidence_score, false, alt(`${pfx}.city`)));
    rows.push(makeRow(`${pfx}.state`, "Law Firm", `Firm ${i + 1} — State`, `${pfx}.state`, lawFirm.state.value, lawFirm.state.source, lawFirm.state.confirmed, lawFirm.state.conflict, lawFirm.state.confidence_score, false, alt(`${pfx}.state`)));
    rows.push(makeRow(`${pfx}.zip`, "Law Firm", `Firm ${i + 1} — ZIP`, `${pfx}.zip`, lawFirm.zip.value, lawFirm.zip.source, lawFirm.zip.confirmed, lawFirm.zip.conflict, lawFirm.zip.confidence_score, false, alt(`${pfx}.zip`)));
    rows.push(makeRow(`${pfx}.phone`, "Law Firm", `Firm ${i + 1} — Phone`, `${pfx}.phone`, lawFirm.phone.value, lawFirm.phone.source, lawFirm.phone.confirmed, lawFirm.phone.conflict, lawFirm.phone.confidence_score, false, alt(`${pfx}.phone`)));
    rows.push(makeRow(`${pfx}.fax`, "Law Firm", `Firm ${i + 1} — Fax`, `${pfx}.fax`, lawFirm.fax.value, lawFirm.fax.source, lawFirm.fax.confirmed, lawFirm.fax.conflict, lawFirm.fax.confidence_score, false, alt(`${pfx}.fax`)));
    rows.push(makeRow(`${pfx}.email`, "Law Firm", `Firm ${i + 1} — Email`, `${pfx}.email`, lawFirm.email.value, lawFirm.email.source, lawFirm.email.confirmed, lawFirm.email.conflict, lawFirm.email.confidence_score, false, alt(`${pfx}.email`)));
  });

  // ── Session ───────────────────────────────────────────────────────────────
  const s = record.session;
  rows.push(makeRow("session.deposition_date",  "Session", "Deposition Date",    "session.deposition_date",  s.deposition_date.value,  s.deposition_date.source,  s.deposition_date.confirmed,  s.deposition_date.conflict,  s.deposition_date.confidence_score,  true));
  rows.push(makeRow("session.start_time",       "Session", "Start Time",         "session.start_time",       s.start_time.value,       s.start_time.source,       s.start_time.confirmed,       s.start_time.conflict,       s.start_time.confidence_score,       false));
  rows.push(makeRow("session.end_time",         "Session", "End Time",           "session.end_time",         s.end_time.value,         s.end_time.source,         s.end_time.confirmed,         s.end_time.conflict,         s.end_time.confidence_score,         false));
  rows.push(makeRow("session.location_type",    "Session", "Location Type",      "session.location_type",    formatLocationType(s.location_type.value), s.location_type.source, s.location_type.confirmed, s.location_type.conflict, s.location_type.confidence_score, false));
  rows.push(makeRow("session.location_address", "Session", "Address",            "session.location_address", s.location_address.value, s.location_address.source, s.location_address.confirmed, s.location_address.conflict, s.location_address.confidence_score, true));
  rows.push(makeRow("session.location_city",    "Session", "City",               "session.location_city",    s.location_city.value,    s.location_city.source,    s.location_city.confirmed,    s.location_city.conflict,    s.location_city.confidence_score,    true));
  rows.push(makeRow("session.location_county",  "Session", "County",             "session.location_county",  s.location_county.value,  s.location_county.source,  s.location_county.confirmed,  s.location_county.conflict,  s.location_county.confidence_score,  true));
  rows.push(makeRow("session.location_state",   "Session", "State",              "session.location_state",   s.location_state.value,   s.location_state.source,   s.location_state.confirmed,   s.location_state.conflict,   s.location_state.confidence_score,   true));
  rows.push(makeRow("session.location_zip",     "Session", "ZIP Code",           "session.location_zip",     s.location_zip.value,     s.location_zip.source,     s.location_zip.confirmed,     s.location_zip.conflict,     s.location_zip.confidence_score,     false));
  rows.push(makeRow("session.reporting_method", "Session", "Reporting Method",   "session.reporting_method", s.reporting_method.value, s.reporting_method.source, s.reporting_method.confirmed, s.reporting_method.conflict, s.reporting_method.confidence_score, true));
  rows.push(makeRow("session.remote_platform",  "Session", "Remote Platform",    "session.remote_platform",  s.remote_platform.value, s.remote_platform.source, s.remote_platform.confirmed, s.remote_platform.conflict, s.remote_platform.confidence_score, false));

  const sched = record.scheduling;
  rows.push(makeRow("scheduling.proceeding_type", "Scheduling", "Proceeding Type", "scheduling.proceeding_type", sched.proceeding_type.value, sched.proceeding_type.source, sched.proceeding_type.confirmed, sched.proceeding_type.conflict, sched.proceeding_type.confidence_score, false));
  rows.push(makeRow("scheduling.remote_platform", "Scheduling", "Remote Platform", "scheduling.remote_platform", sched.remote_platform.value, sched.remote_platform.source, sched.remote_platform.confirmed, sched.remote_platform.conflict, sched.remote_platform.confidence_score, false));
  rows.push(makeRow("scheduling.noticing_party", "Scheduling", "Noticing Party", "scheduling.noticing_party", sched.noticing_party.value, sched.noticing_party.source, sched.noticing_party.confirmed, sched.noticing_party.conflict, sched.noticing_party.confidence_score, false));
  rows.push(makeRow("scheduling.ordered_by", "Scheduling", "Ordered By", "scheduling.ordered_by", sched.ordered_by.value, sched.ordered_by.source, sched.ordered_by.confirmed, sched.ordered_by.conflict, sched.ordered_by.confidence_score, false));
  rows.push(makeRow("scheduling.scheduler", "Scheduling", "Scheduler", "scheduling.scheduler", sched.scheduler.value, sched.scheduler.source, sched.scheduler.confirmed, sched.scheduler.conflict, sched.scheduler.confidence_score, false));
  rows.push(makeRow("scheduling.scheduling_contact", "Scheduling", "Scheduling Contact", "scheduling.scheduling_contact", sched.scheduling_contact.value, sched.scheduling_contact.source, sched.scheduling_contact.confirmed, sched.scheduling_contact.conflict, sched.scheduling_contact.confidence_score, false));
  rows.push(makeRow("scheduling.service_type", "Scheduling", "Service Type", "scheduling.service_type", sched.service_type.value, sched.service_type.source, sched.service_type.confirmed, sched.service_type.conflict, sched.service_type.confidence_score, false));
  rows.push(makeRow("scheduling.time_zone", "Scheduling", "Time Zone", "scheduling.time_zone", sched.time_zone.value, sched.time_zone.source, sched.time_zone.confirmed, sched.time_zone.conflict, sched.time_zone.confidence_score, false));
  rows.push(makeRow("scheduling.remote_location", "Scheduling", "Remote Location", "scheduling.remote_location", sched.remote_location.value, sched.remote_location.source, sched.remote_location.confirmed, sched.remote_location.conflict, sched.remote_location.confidence_score, false));

  const service = record.service;
  rows.push(makeRow("service.certificate_of_service", "Service", "Certificate of Service", "service.certificate_of_service", service.certificate_of_service.value, service.certificate_of_service.source, service.certificate_of_service.confirmed, service.certificate_of_service.conflict, service.certificate_of_service.confidence_score, false));
  rows.push(makeRow("service.service_date", "Service", "Service Date", "service.service_date", service.service_date.value, service.service_date.source, service.service_date.confirmed, service.service_date.conflict, service.service_date.confidence_score, false));
  rows.push(makeRow("service.served_parties", "Service", "Served Parties", "service.served_parties", service.served_parties.value.join("; "), service.served_parties.source, service.served_parties.confirmed, service.served_parties.conflict, service.served_parties.confidence_score, false));
  rows.push(makeRow("service.service_emails", "Service", "Service Emails", "service.service_emails", service.service_emails.value.join("; "), service.service_emails.source, service.service_emails.confirmed, service.service_emails.conflict, service.service_emails.confidence_score, false));

  const requests = record.reporter_requests;
  rows.push(makeRow("reporter_requests.certified_reporter_required", "Court Reporter", "Certified Reporter Required", "reporter_requests.certified_reporter_required", requests.certified_reporter_required.value, requests.certified_reporter_required.source, requests.certified_reporter_required.confirmed, requests.certified_reporter_required.conflict, requests.certified_reporter_required.confidence_score, false));
  rows.push(makeRow("reporter_requests.stenographic_recording", "Court Reporter", "Stenographic Recording", "reporter_requests.stenographic_recording", requests.stenographic_recording.value, requests.stenographic_recording.source, requests.stenographic_recording.confirmed, requests.stenographic_recording.conflict, requests.stenographic_recording.confidence_score, false));
  rows.push(makeRow("reporter_requests.audiovisual_recording", "Court Reporter", "Audiovisual Recording", "reporter_requests.audiovisual_recording", requests.audiovisual_recording.value, requests.audiovisual_recording.source, requests.audiovisual_recording.confirmed, requests.audiovisual_recording.conflict, requests.audiovisual_recording.confidence_score, false));
  rows.push(makeRow("reporter_requests.realtime_requested", "Court Reporter", "Realtime Requested", "reporter_requests.realtime_requested", requests.realtime_requested.value, requests.realtime_requested.source, requests.realtime_requested.confirmed, requests.realtime_requested.conflict, requests.realtime_requested.confidence_score, false));
  rows.push(makeRow("reporter_requests.expedited_delivery", "Court Reporter", "Expedited Delivery", "reporter_requests.expedited_delivery", requests.expedited_delivery.value, requests.expedited_delivery.source, requests.expedited_delivery.confirmed, requests.expedited_delivery.conflict, requests.expedited_delivery.confidence_score, false));
  rows.push(makeRow("reporter_requests.rush_delivery", "Court Reporter", "Rush Delivery", "reporter_requests.rush_delivery", requests.rush_delivery.value, requests.rush_delivery.source, requests.rush_delivery.confirmed, requests.rush_delivery.conflict, requests.rush_delivery.confidence_score, false));
  rows.push(makeRow("reporter_requests.daily_copy", "Court Reporter", "Daily Copy", "reporter_requests.daily_copy", requests.daily_copy.value, requests.daily_copy.source, requests.daily_copy.confirmed, requests.daily_copy.conflict, requests.daily_copy.confidence_score, false));
  rows.push(makeRow("reporter_requests.rough_draft", "Court Reporter", "Rough Draft", "reporter_requests.rough_draft", requests.rough_draft.value, requests.rough_draft.source, requests.rough_draft.confirmed, requests.rough_draft.conflict, requests.rough_draft.confidence_score, false));

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
  witnesses.forEach((w, i) => {
    const pfx = `witnesses[${i}]`;
    rows.push(makeRow(`${pfx}.name`,     "Witness", `Witness ${i + 1} — Name`,     `${pfx}.name`,     w.name.value,     w.name.source,     w.name.confirmed,     w.name.conflict,     w.name.confidence_score,     true,  alt(`${pfx}.name`)));
    rows.push(makeRow(`${pfx}.role`,     "Witness", `Witness ${i + 1} — Role`,     `${pfx}.role`,     w.role.value,     w.role.source,     w.role.confirmed,     w.role.conflict,     w.role.confidence_score,     true,  alt(`${pfx}.role`)));
    rows.push(makeRow(`${pfx}.title`,    "Witness", `Witness ${i + 1} — Title`,    `${pfx}.title`,    w.title.value,    w.title.source,    w.title.confirmed,    w.title.conflict,    w.title.confidence_score,    false, alt(`${pfx}.title`)));
    rows.push(makeRow(`${pfx}.employer`, "Witness", `Witness ${i + 1} — Employer`, `${pfx}.employer`, w.employer.value, w.employer.source, w.employer.confirmed, w.employer.conflict, w.employer.confidence_score, false, alt(`${pfx}.employer`)));
    rows.push(makeRow(`${pfx}.party_affiliation`, "Witness", `Witness ${i + 1} — Party Affiliation`, `${pfx}.party_affiliation`, w.party_affiliation.value, w.party_affiliation.source, w.party_affiliation.confirmed, w.party_affiliation.conflict, w.party_affiliation.confidence_score, false));
    rows.push(makeRow(`${pfx}.read_and_sign`, "Witness", `Witness ${i + 1} — Read & Sign`, `${pfx}.read_and_sign`, w.read_and_sign.value, w.read_and_sign.source, w.read_and_sign.confirmed, w.read_and_sign.conflict, w.read_and_sign.confidence_score, false));
    rows.push(makeRow(`${pfx}.requires_interpreter`, "Witness", `Witness ${i + 1} — Interpreter Required`, `${pfx}.requires_interpreter`, w.requires_interpreter.value, w.requires_interpreter.source, w.requires_interpreter.confirmed, w.requires_interpreter.conflict, w.requires_interpreter.confidence_score, false));
    rows.push(makeRow(`${pfx}.requires_videographer`, "Witness", `Witness ${i + 1} — Videographer Required`, `${pfx}.requires_videographer`, w.requires_videographer.value, w.requires_videographer.source, w.requires_videographer.confirmed, w.requires_videographer.conflict, w.requires_videographer.confidence_score, false));
  });

  // ── Attorneys ─────────────────────────────────────────────────────────────
  attorneys.forEach((a, i) => {
    const pfx = `attorneys[${i}]`;
    rows.push(makeRow(`${pfx}.name`,         "Attorney", `Attorney ${i + 1} — Name`,         `${pfx}.name`,         a.name.value,         a.name.source,         a.name.confirmed,         a.name.conflict,         a.name.confidence_score,         true,  alt(`${pfx}.name`)));
    rows.push(makeRow(`${pfx}.firm`,         "Attorney", `Attorney ${i + 1} — Firm`,         `${pfx}.firm`,         a.firm.value,         a.firm.source,         a.firm.confirmed,         a.firm.conflict,         a.firm.confidence_score,         false, alt(`${pfx}.firm`)));
    rows.push(makeRow(`${pfx}.role`,         "Attorney", `Attorney ${i + 1} — Role`,         `${pfx}.role`,         a.role.value,         a.role.source,         a.role.confirmed,         a.role.conflict,         a.role.confidence_score,         true,  alt(`${pfx}.role`)));
    rows.push(makeRow(`${pfx}.representing`, "Attorney", `Attorney ${i + 1} — Representing`, `${pfx}.representing`, a.representing.value, a.representing.source, a.representing.confirmed, a.representing.conflict, a.representing.confidence_score, false, alt(`${pfx}.representing`)));
    rows.push(makeRow(`${pfx}.bar_number`,   "Attorney", `Attorney ${i + 1} — Bar No.`,      `${pfx}.bar_number`,   a.bar_number.value,   a.bar_number.source,   a.bar_number.confirmed,   a.bar_number.conflict,   a.bar_number.confidence_score,   false, alt(`${pfx}.bar_number`)));
  });

  // ── Interpreters ──────────────────────────────────────────────────────────
  interpreters.forEach((interp, i) => {
    const pfx = `interpreters[${i}]`;
    rows.push(makeRow(`${pfx}.name`, "Interpreter", `Interpreter ${i + 1} — Name`, `${pfx}.name`, interp.name.value, interp.name.source, interp.name.confirmed, interp.name.conflict, interp.name.confidence_score, true, alt(`${pfx}.name`)));
  });

  // ── Videographers ─────────────────────────────────────────────────────────
  videographers.forEach((vid, i) => {
    const pfx = `videographers[${i}]`;
    rows.push(makeRow(`${pfx}.name`, "Videographer", `Videographer ${i + 1} — Name`, `${pfx}.name`, vid.name.value, vid.name.source, vid.name.confirmed, vid.name.conflict, vid.name.confidence_score, false, alt(`${pfx}.name`)));
    rows.push(makeRow(`${pfx}.firm`, "Videographer", `Videographer ${i + 1} — Firm`, `${pfx}.firm`, vid.firm.value, vid.firm.source, vid.firm.confirmed, vid.firm.conflict, vid.firm.confidence_score, false, alt(`${pfx}.firm`)));
  });

  return rows;
}
