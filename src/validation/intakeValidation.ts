import type { Attorney, CaseRecord, Interpreter, Participant, Videographer, Witness } from "../types/case";

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

export interface IntakeFileState {
  hasNotice: boolean;
  hasScheduling: boolean;
  hasSupporting: boolean;
  hasAudio: boolean;
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function fieldValue(field: unknown): unknown {
  if (!field || typeof field !== "object" || !("value" in field)) {
    return null;
  }

  return (field as { value?: unknown }).value ?? null;
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function countMissing<T>(items: T[], predicate: (item: T) => boolean): number {
  return items.filter(predicate).length;
}

export function evaluateIntake(record: CaseRecord, fileState: IntakeFileState): IntakeValidationResult {
  const items: ValidationItem[] = [];
  const partial = record as Partial<CaseRecord>;
  const witnesses = safeArray<Witness>(partial.witnesses);
  const attorneys = safeArray<Attorney>(partial.attorneys);
  const interpreters = safeArray<Interpreter>(partial.interpreters);
  const videographers = safeArray<Videographer>(partial.videographers);
  const participants = safeArray<Participant>(partial.participants);
  const caption = partial.caption;
  const session = partial.session;
  const reporter = partial.reporter;
  const hasStartTime = hasValue(fieldValue(session?.start_time));
  const hasEndTime = hasValue(fieldValue(session?.end_time));
  const isRemote = Boolean(session?.is_remote);
  const remotePlatform = fieldValue(session?.remote_platform);

  const witnessWithName = witnesses.find((witness) => hasValue(fieldValue(witness?.name)));
  items.push({
    id: "fail.witness_name",
    tier: "FAIL",
    label: "Witness full legal name",
    fieldPath: witnessWithName ? "witnesses[0].name" : null,
    satisfied: witnessWithName !== undefined,
  });

  items.push({
    id: "fail.cause_number",
    tier: "FAIL",
    label: "Cause number",
    fieldPath: "caption.case_number",
    satisfied: hasValue(fieldValue(caption?.case_number)),
  });

  items.push({
    id: "fail.case_style_or_name",
    tier: "FAIL",
    label: "Case style / case name",
    fieldPath: "caption.case_style",
    satisfied: hasValue(fieldValue(caption?.case_style)) || hasValue(fieldValue(caption?.case_name)),
  });

  items.push({
    id: "fail.court",
    tier: "FAIL",
    label: "Court",
    fieldPath: "caption.court_name",
    satisfied: hasValue(fieldValue(caption?.court_name)),
  });

  items.push({
    id: "fail.county",
    tier: "FAIL",
    label: "County",
    fieldPath: "caption.county",
    satisfied: hasValue(fieldValue(caption?.county)),
  });

  items.push({
    id: "fail.deposition_date",
    tier: "FAIL",
    label: "Deposition date",
    fieldPath: "session.deposition_date",
    satisfied: hasValue(fieldValue(session?.deposition_date)),
  });

  const attorneysWithRepresenting = attorneys.filter((attorney) => hasValue(fieldValue(attorney?.representing)));
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
    satisfied: hasValue(fieldValue(session?.reporting_method)),
  });

  items.push({
    id: "fail.audio_uploaded",
    tier: "FAIL",
    label: "Audio file uploaded",
    fieldPath: "audio",
    satisfied: fileState.hasAudio,
    detail: fileState.hasAudio ? undefined : "No durable case audio is attached yet.",
  });

  const missingBarNumbers = countMissing(attorneys, (attorney) => !hasValue(fieldValue(attorney?.bar_number)));
  items.push({
    id: "warning.attorney_sbot",
    tier: "WARNING",
    label: "Attorney SBOT numbers",
    fieldPath: missingBarNumbers > 0 ? "attorneys[0].bar_number" : null,
    satisfied: missingBarNumbers === 0,
    detail: missingBarNumbers > 0 ? `${missingBarNumbers} attorney${missingBarNumbers !== 1 ? "s" : ""} missing SBOT number` : undefined,
  });

  const missingAttorneyAddresses = countMissing(attorneys, (attorney) => !hasValue(attorney?.address));
  items.push({
    id: "warning.attorney_address",
    tier: "WARNING",
    label: "Attorney addresses",
    fieldPath: missingAttorneyAddresses > 0 ? "attorneys[0].address" : null,
    satisfied: missingAttorneyAddresses === 0,
    detail: missingAttorneyAddresses > 0 ? `${missingAttorneyAddresses} attorney${missingAttorneyAddresses !== 1 ? "s" : ""} missing address` : undefined,
  });

  const missingAttorneyPhones = countMissing(attorneys, (attorney) => !hasValue(attorney?.phone));
  items.push({
    id: "warning.attorney_phone",
    tier: "WARNING",
    label: "Attorney phones",
    fieldPath: missingAttorneyPhones > 0 ? "attorneys[0].phone" : null,
    satisfied: missingAttorneyPhones === 0,
    detail: missingAttorneyPhones > 0 ? `${missingAttorneyPhones} attorney${missingAttorneyPhones !== 1 ? "s" : ""} missing phone` : undefined,
  });

  const missingAttorneyEmails = countMissing(attorneys, (attorney) => !hasValue(attorney?.email));
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
    satisfied: hasValue(fieldValue(reporter?.cert_number)),
  });

  items.push({
    id: "warning.reporter_expiration",
    tier: "WARNING",
    label: "Reporter expiration",
    fieldPath: "reporter.license_expiration",
    satisfied: hasValue(fieldValue(reporter?.license_expiration)),
  });

  items.push({
    id: "warning.reporter_firm_registration",
    tier: "WARNING",
    label: "Reporter firm registration",
    fieldPath: "reporter.firm_registration_number",
    satisfied: hasValue(fieldValue(reporter?.firm_registration_number)),
  });

  const interpretersMissingLanguage = countMissing(interpreters, (interpreter) => !hasValue(interpreter?.language_from));
  items.push({
    id: "warning.interpreter_language",
    tier: "WARNING",
    label: "Interpreter language",
    fieldPath: interpretersMissingLanguage > 0 ? "interpreters[0].language_from" : null,
    satisfied: interpretersMissingLanguage === 0,
    detail: interpretersMissingLanguage > 0 ? `${interpretersMissingLanguage} interpreter${interpretersMissingLanguage !== 1 ? "s" : ""} missing source language` : undefined,
  });

  const interpretersMissingOath = countMissing(
    interpreters,
    (interpreter) => interpreter?.oath_administered === null || interpreter?.oath_administered === undefined,
  );
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
    fieldPath: !hasStartTime ? "session.start_time" : "session.end_time",
    satisfied: hasStartTime && hasEndTime,
    detail:
      hasStartTime && hasEndTime
        ? undefined
        : `Missing${!hasStartTime ? " start time" : ""}${!hasStartTime && !hasEndTime ? " and" : ""}${!hasEndTime ? " end time" : ""}`,
  });

  const witnessesMissingAffiliation = countMissing(witnesses, (witness) => !hasValue(fieldValue(witness?.party_affiliation)));
  items.push({
    id: "warning.witness_party_affiliation",
    tier: "WARNING",
    label: "Witness party affiliation",
    fieldPath: witnessesMissingAffiliation > 0 ? "witnesses[0].party_affiliation" : null,
    satisfied: witnessesMissingAffiliation === 0,
    detail: witnessesMissingAffiliation > 0 ? `${witnessesMissingAffiliation} witness${witnessesMissingAffiliation !== 1 ? "es" : ""} missing party affiliation` : undefined,
  });

  const witnessesMissingReadAndSign = countMissing(witnesses, (witness) => !hasValue(fieldValue(witness?.read_and_sign)));
  items.push({
    id: "warning.read_and_sign",
    tier: "WARNING",
    label: "Witness Read & Sign election",
    fieldPath: witnessesMissingReadAndSign > 0 ? "witnesses[0].read_and_sign" : null,
    satisfied: witnessesMissingReadAndSign === 0,
    detail: witnessesMissingReadAndSign > 0 ? `${witnessesMissingReadAndSign} witness${witnessesMissingReadAndSign !== 1 ? "es" : ""} missing Read & Sign election` : undefined,
  });

  const videographersMissingRoleTitle = countMissing(videographers, (videographer) => !hasValue(videographer?.role_title));
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
    satisfied: participants.length > 0,
    detail: participants.length === 0 ? "No other attendees recorded." : undefined,
  });

  const witnessesMissingPrefixSuffix = countMissing(witnesses, (witness) => !hasValue(witness?.prefix_suffix));
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
    fieldPath: isRemote ? "session.remote_platform" : null,
    satisfied: !isRemote || hasValue(remotePlatform),
    detail: isRemote && !hasValue(remotePlatform) ? "Remote proceeding is missing platform details." : undefined,
  });

  items.push({
    id: "info.supporting_documents",
    tier: "INFO",
    label: "Supporting documents",
    fieldPath: null,
    satisfied: fileState.hasSupporting,
    detail: fileState.hasSupporting ? undefined : "No supporting documents uploaded.",
  });

  items.push({
    id: "info.scheduling_notes",
    tier: "INFO",
    label: "Scheduling notes",
    fieldPath: null,
    satisfied: fileState.hasScheduling,
    detail: fileState.hasScheduling ? undefined : "No scheduling notes uploaded.",
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
