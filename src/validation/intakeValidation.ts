import type { CaseRecord } from "../types/case";

export interface ValidationItem {
  id: string;
  tier: "FAIL" | "WARNING" | "INFO";
  label: string;
  fieldPath: string | null;
  satisfied: boolean;
  detail?: string;
}

export interface IntakeValidationResult {
  items: ValidationItem[];
  failCount: number;
  warningCount: number;
  readinessScore: number;
  missingLabels: string[];
  canProceed: boolean;
}

// TODO Phase 3: flip to true when durable audio upload exists
export const AUDIO_FAIL_ENFORCED = false;

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function countMissing<T>(items: T[], predicate: (item: T) => boolean): number {
  return items.filter(predicate).length;
}

export function evaluateIntake(record: CaseRecord): IntakeValidationResult {
  const items: ValidationItem[] = [];

  const witnessWithName = record.witnesses.find((witness) => hasValue(witness.name.value));
  items.push({
    id: "fail.witness_name",
    tier: "FAIL",
    label: "Witness full legal name",
    fieldPath: witnessWithName ? `witnesses[0].name` : null,
    satisfied: witnessWithName !== undefined,
  });

  items.push({
    id: "fail.cause_number",
    tier: "FAIL",
    label: "Cause number",
    fieldPath: "caption.case_number",
    satisfied: hasValue(record.caption.case_number.value),
  });

  items.push({
    id: "fail.case_style_or_name",
    tier: "FAIL",
    label: "Case style / case name",
    fieldPath: "caption.case_style",
    satisfied: hasValue(record.caption.case_style.value) || hasValue(record.caption.case_name.value),
  });

  items.push({
    id: "fail.court",
    tier: "FAIL",
    label: "Court",
    fieldPath: "caption.court_name",
    satisfied: hasValue(record.caption.court_name.value),
  });

  items.push({
    id: "fail.county",
    tier: "FAIL",
    label: "County",
    fieldPath: "caption.county",
    satisfied: hasValue(record.caption.county.value),
  });

  items.push({
    id: "fail.deposition_date",
    tier: "FAIL",
    label: "Deposition date",
    fieldPath: "session.deposition_date",
    satisfied: hasValue(record.session.deposition_date.value),
  });

  const attorneysWithRepresenting = record.attorneys.filter((attorney) => hasValue(attorney.representing.value));
  items.push({
    id: "fail.attorney_representing",
    tier: "FAIL",
    label: "At least one attorney with party represented",
    fieldPath: attorneysWithRepresenting.length > 0 ? "attorneys[0].representing" : null,
    satisfied: attorneysWithRepresenting.length > 0,
  });

  items.push({
    id: "fail.reporting_method",
    tier: "FAIL",
    label: "Reporting method",
    fieldPath: "session.reporting_method",
    satisfied: hasValue(record.session.reporting_method.value),
  });

  items.push({
    id: AUDIO_FAIL_ENFORCED ? "fail.audio_uploaded" : "warning.audio_uploaded_pending",
    tier: AUDIO_FAIL_ENFORCED ? "FAIL" : "WARNING",
    label: AUDIO_FAIL_ENFORCED ? "Audio file uploaded" : "Audio file uploaded (enforcement pending)",
    fieldPath: "audio",
    satisfied: record.audio !== null,
    detail: record.audio === null ? "No durable case audio is attached yet." : undefined,
  });

  const missingBarNumbers = countMissing(record.attorneys, (attorney) => !hasValue(attorney.bar_number.value));
  items.push({
    id: "warning.attorney_sbot",
    tier: "WARNING",
    label: "Attorney SBOT numbers",
    fieldPath: missingBarNumbers > 0 ? "attorneys[0].bar_number" : null,
    satisfied: missingBarNumbers === 0,
    detail: missingBarNumbers > 0 ? `${missingBarNumbers} attorney${missingBarNumbers !== 1 ? "s" : ""} missing SBOT number` : undefined,
  });

  const missingAttorneyAddresses = countMissing(record.attorneys, (attorney) => !hasValue(attorney.address));
  items.push({
    id: "warning.attorney_address",
    tier: "WARNING",
    label: "Attorney addresses",
    fieldPath: missingAttorneyAddresses > 0 ? "attorneys[0].address" : null,
    satisfied: missingAttorneyAddresses === 0,
    detail: missingAttorneyAddresses > 0 ? `${missingAttorneyAddresses} attorney${missingAttorneyAddresses !== 1 ? "s" : ""} missing address` : undefined,
  });

  const missingAttorneyPhones = countMissing(record.attorneys, (attorney) => !hasValue(attorney.phone));
  items.push({
    id: "warning.attorney_phone",
    tier: "WARNING",
    label: "Attorney phones",
    fieldPath: missingAttorneyPhones > 0 ? "attorneys[0].phone" : null,
    satisfied: missingAttorneyPhones === 0,
    detail: missingAttorneyPhones > 0 ? `${missingAttorneyPhones} attorney${missingAttorneyPhones !== 1 ? "s" : ""} missing phone` : undefined,
  });

  const missingAttorneyEmails = countMissing(record.attorneys, (attorney) => !hasValue(attorney.email));
  items.push({
    id: "warning.attorney_email",
    tier: "WARNING",
    label: "Attorney emails",
    fieldPath: missingAttorneyEmails > 0 ? "attorneys[0].email" : null,
    satisfied: missingAttorneyEmails === 0,
    detail: missingAttorneyEmails > 0 ? `${missingAttorneyEmails} attorney${missingAttorneyEmails !== 1 ? "s" : ""} missing email` : undefined,
  });

  items.push({
    id: "warning.reporter_csr",
    tier: "WARNING",
    label: "Reporter CSR number",
    fieldPath: "reporter.cert_number",
    satisfied: hasValue(record.reporter.cert_number.value),
  });

  items.push({
    id: "warning.reporter_expiration",
    tier: "WARNING",
    label: "Reporter expiration",
    fieldPath: "reporter.license_expiration",
    satisfied: hasValue(record.reporter.license_expiration.value),
  });

  items.push({
    id: "warning.reporter_firm_registration",
    tier: "WARNING",
    label: "Reporter firm registration",
    fieldPath: "reporter.firm_registration_number",
    satisfied: hasValue(record.reporter.firm_registration_number.value),
  });

  const interpretersMissingLanguage = countMissing(record.interpreters, (interpreter) => !hasValue(interpreter.language_from));
  items.push({
    id: "warning.interpreter_language",
    tier: "WARNING",
    label: "Interpreter language",
    fieldPath: interpretersMissingLanguage > 0 ? "interpreters[0].language_from" : null,
    satisfied: interpretersMissingLanguage === 0,
    detail: interpretersMissingLanguage > 0 ? `${interpretersMissingLanguage} interpreter${interpretersMissingLanguage !== 1 ? "s" : ""} missing source language` : undefined,
  });

  const interpretersMissingOath = countMissing(record.interpreters, (interpreter) => interpreter.oath_administered === null);
  items.push({
    id: "warning.interpreter_oath",
    tier: "WARNING",
    label: "Interpreter oath status",
    fieldPath: interpretersMissingOath > 0 ? "interpreters[0].oath_administered" : null,
    satisfied: interpretersMissingOath === 0,
    detail: interpretersMissingOath > 0 ? `${interpretersMissingOath} interpreter${interpretersMissingOath !== 1 ? "s" : ""} missing oath status` : undefined,
  });

  items.push({
    id: "warning.session_times",
    tier: "WARNING",
    label: "Start and end times",
    fieldPath: !hasValue(record.session.start_time.value) ? "session.start_time" : "session.end_time",
    satisfied: hasValue(record.session.start_time.value) && hasValue(record.session.end_time.value),
    detail:
      hasValue(record.session.start_time.value) && hasValue(record.session.end_time.value)
        ? undefined
        : `Missing${!hasValue(record.session.start_time.value) ? " start time" : ""}${!hasValue(record.session.start_time.value) && !hasValue(record.session.end_time.value) ? " and" : ""}${!hasValue(record.session.end_time.value) ? " end time" : ""}`,
  });

  const witnessesMissingAffiliation = countMissing(record.witnesses, (witness) => !hasValue(witness.party_affiliation.value));
  items.push({
    id: "warning.witness_party_affiliation",
    tier: "WARNING",
    label: "Witness party affiliation",
    fieldPath: witnessesMissingAffiliation > 0 ? "witnesses[0].party_affiliation" : null,
    satisfied: witnessesMissingAffiliation === 0,
    detail: witnessesMissingAffiliation > 0 ? `${witnessesMissingAffiliation} witness${witnessesMissingAffiliation !== 1 ? "es" : ""} missing party affiliation` : undefined,
  });

  const witnessesMissingReadAndSign = countMissing(record.witnesses, (witness) => !hasValue(witness.read_and_sign.value));
  items.push({
    id: "warning.read_and_sign",
    tier: "WARNING",
    label: "Witness Read & Sign election",
    fieldPath: witnessesMissingReadAndSign > 0 ? "witnesses[0].read_and_sign" : null,
    satisfied: witnessesMissingReadAndSign === 0,
    detail: witnessesMissingReadAndSign > 0 ? `${witnessesMissingReadAndSign} witness${witnessesMissingReadAndSign !== 1 ? "es" : ""} missing Read & Sign election` : undefined,
  });

  const videographersMissingRoleTitle = countMissing(record.videographers, (videographer) => !hasValue(videographer.role_title));
  items.push({
    id: "info.videographer_role_title",
    tier: "INFO",
    label: "Videographer role/title",
    fieldPath: videographersMissingRoleTitle > 0 ? "videographers[0].role_title" : null,
    satisfied: videographersMissingRoleTitle === 0,
    detail: videographersMissingRoleTitle > 0 ? `${videographersMissingRoleTitle} videographer${videographersMissingRoleTitle !== 1 ? "s" : ""} missing role/title` : undefined,
  });

  items.push({
    id: "info.other_attendees",
    tier: "INFO",
    label: "Other attendees recorded",
    fieldPath: "participants",
    satisfied: record.participants.length > 0,
    detail: record.participants.length === 0 ? "No other attendees recorded." : undefined,
  });

  const witnessesMissingPrefixSuffix = countMissing(record.witnesses, (witness) => !hasValue(witness.prefix_suffix));
  items.push({
    id: "info.witness_prefix_suffix",
    tier: "INFO",
    label: "Witness prefix/suffix",
    fieldPath: witnessesMissingPrefixSuffix > 0 ? "witnesses[0].prefix_suffix" : null,
    satisfied: witnessesMissingPrefixSuffix === 0,
    detail: witnessesMissingPrefixSuffix > 0 ? `${witnessesMissingPrefixSuffix} witness${witnessesMissingPrefixSuffix !== 1 ? "es" : ""} missing prefix/suffix` : undefined,
  });

  items.push({
    id: "info.remote_platform",
    tier: "INFO",
    label: "Remote platform",
    fieldPath: record.session.is_remote ? "session.remote_platform" : null,
    satisfied: !record.session.is_remote || hasValue(record.session.remote_platform),
    detail: record.session.is_remote && !hasValue(record.session.remote_platform) ? "Remote proceeding is missing platform details." : undefined,
  });

  items.push({
    id: "info.supporting_documents",
    tier: "INFO",
    label: "Supporting documents",
    fieldPath: null,
    satisfied: false,
    detail: "Supporting document uploads are not persisted to CaseRecord yet.",
  });

  items.push({
    id: "info.scheduling_notes",
    tier: "INFO",
    label: "Scheduling notes",
    fieldPath: null,
    satisfied: false,
    detail: "Scheduling note uploads are not persisted to CaseRecord yet.",
  });

  const failCount = items.filter((item) => item.tier === "FAIL" && !item.satisfied).length;
  const warningCount = items.filter((item) => item.tier === "WARNING" && !item.satisfied).length;
  const readinessScore = Math.round((items.filter((item) => item.satisfied).length / items.length) * 100);
  const missingLabels = items
    .filter((item) => !item.satisfied && (item.tier === "FAIL" || item.tier === "WARNING"))
    .map((item) => item.label);

  return {
    items,
    failCount,
    warningCount,
    readinessScore,
    missingLabels,
    canProceed: failCount === 0,
  };
}
