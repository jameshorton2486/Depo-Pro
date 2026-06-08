import type { Attorney, CaseParty, CaseRecord, DeepgramKeyterm, FieldSource, LawFirm, Witness } from "../../types/case";
import type {
  ExtractedAttorney,
  ExtractedConfidenceValue,
  ExtractedLawFirm,
  ExtractedNODFields,
  ExtractedParty,
} from "./aiExtractionTypes";

export interface ExtractionFieldUpdate {
  path: string;
  value: unknown;
  confidence_score: number | null;
  label: string;
}

export interface ExtractionConflict {
  path: string;
  label: string;
  currentValue: string;
  currentSource: FieldSource;
  incomingValue: string;
  incomingConfidence: number | null;
}

export interface AttorneyAddition {
  attorney: Omit<Attorney, "attorney_id">;
}

export interface AttorneyPatch {
  attorney_id: string;
  patch: Partial<Omit<Attorney, "attorney_id">>;
}

export interface WitnessAddition {
  witness: Omit<Witness, "witness_id">;
}

export interface WitnessPatch {
  witness_id: string;
  patch: Partial<Omit<Witness, "witness_id">>;
}

export interface PartyAddition {
  party: Omit<CaseParty, "party_id">;
}

export interface PartyPatch {
  party_id: string;
  patch: Partial<Omit<CaseParty, "party_id">>;
}

export interface LawFirmAddition {
  law_firm: Omit<LawFirm, "law_firm_id">;
}

export interface LawFirmPatch {
  law_firm_id: string;
  patch: Partial<Omit<LawFirm, "law_firm_id">>;
}

export interface ExtractionApplication {
  fieldUpdates: ExtractionFieldUpdate[];
  attorneyAdds: AttorneyAddition[];
  attorneyPatches: AttorneyPatch[];
  witnessAdds: WitnessAddition[];
  witnessPatches: WitnessPatch[];
  partyAdds: PartyAddition[];
  partyPatches: PartyPatch[];
  lawFirmAdds: LawFirmAddition[];
  lawFirmPatches: LawFirmPatch[];
  conflicts: ExtractionConflict[];
  keyterms: DeepgramKeyterm[];
}

const DEFAULT_CONFIDENCE = 0.7;

export function applyExtraction(fields: ExtractedNODFields, record: CaseRecord): ExtractionApplication {
  const fieldUpdates: ExtractionFieldUpdate[] = [];
  const conflicts: ExtractionConflict[] = [];
  const attorneyAdds: AttorneyAddition[] = [];
  const attorneyPatches: AttorneyPatch[] = [];
  const witnessAdds: WitnessAddition[] = [];
  const witnessPatches: WitnessPatch[] = [];
  const partyAdds: PartyAddition[] = [];
  const partyPatches: PartyPatch[] = [];
  const lawFirmAdds: LawFirmAddition[] = [];
  const lawFirmPatches: LawFirmPatch[] = [];

  queueField(fieldUpdates, conflicts, record, "caption.case_number", fields.cause_number, "Case Number");
  queueField(fieldUpdates, conflicts, record, "caption.case_style", fields.case_style, "Case Style");

  if (!cleanupValue(record.caption.case_name.value)) {
    queueField(fieldUpdates, conflicts, record, "caption.case_name", fields.case_style, "Case Name");
  }

  const courtName = composeCourtName(fields);
  queueField(
    fieldUpdates,
    conflicts,
    record,
    "caption.court_name",
    withConfidence(courtName, maxConfidence(fields.court_name, fields.district, fields.division)),
    "Court Name",
  );
  queueField(
    fieldUpdates,
    conflicts,
    record,
    "caption.judicial_district",
    withConfidence(orNull(valueOf(fields.district)), confidenceOf(fields.district)),
    "Judicial District",
  );
  queueField(
    fieldUpdates,
    conflicts,
    record,
    "caption.division",
    withConfidence(orNull(valueOf(fields.division)), confidenceOf(fields.division)),
    "Division",
  );
  queueField(fieldUpdates, conflicts, record, "caption.county", withConfidence(normalizeCounty(valueOf(fields.county)), confidenceOf(fields.county)), "County");
  queueField(fieldUpdates, conflicts, record, "caption.state", withConfidence(normalizeState(valueOf(fields.state)), confidenceOf(fields.state)), "State");
  queueField(
    fieldUpdates,
    conflicts,
    record,
    "caption.jurisdiction_type",
    withConfidence(mapJurisdictionType(valueOf(fields.jurisdiction_type), valueOf(fields.state), valueOf(fields.court_name)), confidenceOf(fields.jurisdiction_type, fields.state, fields.court_name)),
    "Jurisdiction Type",
  );
  queueField(fieldUpdates, conflicts, record, "caption.venue", withConfidence(composeVenue(fields), maxConfidence(fields.division, fields.district, fields.county)), "Venue");

  queueField(fieldUpdates, conflicts, record, "session.deposition_date", withConfidence(normalizeISODate(valueOf(fields.deposition_date)), confidenceOf(fields.deposition_date)), "Deposition Date");
  queueField(fieldUpdates, conflicts, record, "session.start_time", withConfidence(normalizeISOTime(valueOf(fields.start_time)), confidenceOf(fields.start_time)), "Start Time");
  queueField(fieldUpdates, conflicts, record, "session.end_time", withConfidence(normalizeISOTime(valueOf(fields.end_time)), confidenceOf(fields.end_time)), "End Time");

  const location = resolveLocation(fields);
  queueField(fieldUpdates, conflicts, record, "session.location_address", location.address, "Address");
  queueField(fieldUpdates, conflicts, record, "session.location_city", location.city, "City");
  queueField(fieldUpdates, conflicts, record, "session.location_state", location.state, "State");
  queueField(fieldUpdates, conflicts, record, "session.location_zip", location.zip, "ZIP Code");
  queueField(
    fieldUpdates,
    conflicts,
    record,
    "session.location_county",
    withConfidence(normalizeCounty(valueOf(fields.county)), confidenceOf(fields.county)),
    "County",
  );
  queueField(
    fieldUpdates,
    conflicts,
    record,
    "session.reporting_method",
    withConfidence(mapReportingMethod(fields), confidenceOf(fields.reporting_method, fields.remote.is_remote, fields.remote.platform)),
    "Reporting Method",
  );
  queueField(
    fieldUpdates,
    conflicts,
    record,
    "session.location_type",
    withConfidence(mapLocationType(fields), confidenceOf(fields.remote.is_remote, fields.remote.platform, fields.location.address)),
    "Location Type",
  );
  queueField(
    fieldUpdates,
    conflicts,
    record,
    "session.remote_platform",
    withConfidence(orNull(cleanupValue(valueOf(fields.remote.platform))), confidenceOf(fields.remote.platform)),
    "Remote Platform",
  );

  queueField(fieldUpdates, conflicts, record, "scheduling.proceeding_type", fields.scheduling.proceeding_type, "Proceeding Type");
  queueField(fieldUpdates, conflicts, record, "scheduling.remote_platform", fields.scheduling.remote_platform, "Remote Platform");
  queueField(fieldUpdates, conflicts, record, "scheduling.noticing_party", fields.scheduling.noticing_party, "Noticing Party");
  queueField(fieldUpdates, conflicts, record, "scheduling.ordered_by", fields.scheduling.ordered_by, "Ordered By");
  queueField(fieldUpdates, conflicts, record, "scheduling.scheduler", fields.scheduling.scheduler, "Scheduler");
  queueField(fieldUpdates, conflicts, record, "scheduling.scheduling_contact", fields.scheduling.scheduling_contact, "Scheduling Contact");
  queueField(fieldUpdates, conflicts, record, "scheduling.service_type", fields.scheduling.service_type, "Service Type");
  queueField(fieldUpdates, conflicts, record, "scheduling.time_zone", fields.scheduling.time_zone, "Time Zone");
  queueField(fieldUpdates, conflicts, record, "scheduling.remote_location", fields.scheduling.remote_location, "Remote Location");

  queueField(fieldUpdates, conflicts, record, "service.certificate_of_service", fields.service.certificate_of_service, "Certificate of Service");
  queueField(
    fieldUpdates,
    conflicts,
    record,
    "service.service_date",
    withConfidence(normalizeISODate(orNull(valueOf(fields.service.service_date))), confidenceOf(fields.service.service_date)),
    "Service Date",
  );
  queueField(fieldUpdates, conflicts, record, "service.served_parties", fields.service.served_parties, "Served Parties");
  queueField(fieldUpdates, conflicts, record, "service.service_emails", fields.service.service_emails, "Service Emails");

  queueField(fieldUpdates, conflicts, record, "reporter_requests.certified_reporter_required", fields.reporter_requests.certified_reporter_required, "Certified Court Reporter Required");
  queueField(fieldUpdates, conflicts, record, "reporter_requests.stenographic_recording", fields.reporter_requests.stenographic_recording, "Stenographic Recording");
  queueField(fieldUpdates, conflicts, record, "reporter_requests.audiovisual_recording", fields.reporter_requests.audiovisual_recording, "Audiovisual Recording");
  queueField(fieldUpdates, conflicts, record, "reporter_requests.realtime_requested", fields.reporter_requests.realtime_requested, "Realtime Requested");
  queueField(fieldUpdates, conflicts, record, "reporter_requests.expedited_delivery", fields.reporter_requests.expedited_delivery, "Expedited Delivery");
  queueField(fieldUpdates, conflicts, record, "reporter_requests.rush_delivery", fields.reporter_requests.rush_delivery, "Rush Delivery");
  queueField(fieldUpdates, conflicts, record, "reporter_requests.daily_copy", fields.reporter_requests.daily_copy, "Daily Copy");
  queueField(fieldUpdates, conflicts, record, "reporter_requests.rough_draft", fields.reporter_requests.rough_draft, "Rough Draft");

  applyWitnessExtraction(fields, record, fieldUpdates, conflicts, witnessAdds);
  applyAttorneyExtraction(fields, record, attorneyAdds, attorneyPatches);
  applyPartyExtraction(fields, record, partyAdds, partyPatches);
  applyLawFirmExtraction(fields, record, lawFirmAdds, lawFirmPatches);

  return {
    fieldUpdates,
    attorneyAdds,
    attorneyPatches,
    witnessAdds,
    witnessPatches,
    partyAdds,
    partyPatches,
    lawFirmAdds,
    lawFirmPatches,
    conflicts,
    keyterms: buildKeyterms(fields),
  };
}

function applyWitnessExtraction(
  fields: ExtractedNODFields,
  record: CaseRecord,
  fieldUpdates: ExtractionFieldUpdate[],
  conflicts: ExtractionConflict[],
  witnessAdds: WitnessAddition[],
) {
  const witnessName = cleanupValue(valueOf(fields.witness.name));
  const partyAffiliation = mapPartyAffiliation(valueOf(fields.witness.party_affiliation));
  const witnessRole = mapWitnessRole(valueOf(fields.witness.role));
  const readAndSign = mapReadAndSign(valueOf(fields.witness.read_and_sign));
  const interpreterRequired = valueOf(fields.witness.interpreter_required);
  const videographerRequired = valueOf(fields.witness.videographer_required);
  if (!witnessName && !partyAffiliation && !witnessRole && !readAndSign && interpreterRequired == null && videographerRequired == null) {
    return;
  }

  const existing = record.witnesses[0];
  if (existing) {
    if (witnessName) {
      queueField(fieldUpdates, conflicts, record, "witnesses[0].name", withConfidence(witnessName, confidenceOf(fields.witness.name)), "Witness 1 - Name");
    }
    if (witnessRole) {
      queueField(fieldUpdates, conflicts, record, "witnesses[0].role", withConfidence(witnessRole, confidenceOf(fields.witness.role)), "Witness 1 - Role");
    }
    if (partyAffiliation) {
      queueField(
        fieldUpdates,
        conflicts,
        record,
        "witnesses[0].party_affiliation",
        withConfidence(partyAffiliation, confidenceOf(fields.witness.party_affiliation)),
        "Witness 1 - Party Affiliation",
      );
    }
    if (readAndSign) {
      queueField(
        fieldUpdates,
        conflicts,
        record,
        "witnesses[0].read_and_sign",
        withConfidence(readAndSign, confidenceOf(fields.witness.read_and_sign)),
        "Witness 1 - Read and Sign",
      );
    }
    queueField(
      fieldUpdates,
      conflicts,
      record,
      "witnesses[0].requires_interpreter",
      fields.witness.interpreter_required,
      "Witness 1 - Interpreter Required",
    );
    queueField(
      fieldUpdates,
      conflicts,
      record,
      "witnesses[0].requires_videographer",
      fields.witness.videographer_required,
      "Witness 1 - Videographer Required",
    );
    return;
  }

  witnessAdds.push({
    witness: {
      name: extractedField(witnessName, confidenceOf(fields.witness.name)),
      role: extractedField(witnessRole ?? "WITNESS", confidenceOf(fields.witness.role) ?? DEFAULT_CONFIDENCE),
      title: extractedField(null, null),
      employer: extractedField(null, null),
      prefix_suffix: null,
      party_affiliation: extractedField(partyAffiliation, confidenceOf(fields.witness.party_affiliation)),
      is_corporate_rep: false,
      corporate_entity: null,
      read_and_sign: extractedField(readAndSign, confidenceOf(fields.witness.read_and_sign)),
      requires_interpreter: extractedField(interpreterRequired, confidenceOf(fields.witness.interpreter_required)),
      requires_videographer: extractedField(videographerRequired, confidenceOf(fields.witness.videographer_required)),
      spelling_corrections: [],
      email: null,
      phone: null,
    },
  });
}

function applyAttorneyExtraction(
  fields: ExtractedNODFields,
  record: CaseRecord,
  attorneyAdds: AttorneyAddition[],
  attorneyPatches: AttorneyPatch[],
) {
  const plaintiff = cleanupValue(valueOf(fields.plaintiff));
  const defenseParties = valueOf(fields.defendants) ?? [];
  const extractedPartyNames = new Set(
    (fields.parties.length > 0 ? fields.parties : derivePartiesFromCaption(fields))
      .map((party) => normalizeName(valueOf(party.name)))
      .filter(Boolean),
  );
  const pendingAttorneys = new Set(attorneyAdds.map((addition) => normalizeName(addition.attorney.name.value)));

  for (const attorney of fields.attorneys) {
    const attorneyName = cleanupValue(valueOf(attorney.name));
    if (!attorneyName) {
      continue;
    }

    const normalized = normalizeName(attorneyName);
    if (!normalized || extractedPartyNames.has(normalized) || pendingAttorneys.has(normalized)) {
      continue;
    }

    const existing = record.attorneys.find((item) => normalizeName(item.name.value) === normalized);
    const representing = composeRepresenting(attorney, plaintiff, defenseParties);

    if (existing) {
      const patch: Partial<Omit<Attorney, "attorney_id">> = {};
      if (!cleanupValue(existing.firm.value)) patch.firm = extractedField(orNull(valueOf(attorney.firm)), confidenceOf(attorney.firm));
      if (!cleanupValue(existing.representing.value)) patch.representing = extractedField(orNull(representing), confidenceOf(attorney.representing, attorney.side));
      if (!cleanupValue(existing.bar_number.value)) patch.bar_number = extractedField(orNull(valueOf(attorney.bar_number)), confidenceOf(attorney.bar_number));
      if (!existing.address && valueOf(attorney.address)) patch.address = cleanupValue(valueOf(attorney.address));
      if (!existing.city && valueOf(attorney.city)) patch.city = cleanupValue(valueOf(attorney.city));
      if (!existing.state && valueOf(attorney.state)) patch.state = cleanupValue(valueOf(attorney.state)) || null;
      if (!existing.zip && valueOf(attorney.zip)) patch.zip = cleanupValue(valueOf(attorney.zip)) || null;
      if (!existing.email && valueOf(attorney.email)) patch.email = cleanupValue(valueOf(attorney.email)) || null;
      if (!existing.phone && valueOf(attorney.phone)) patch.phone = cleanupValue(valueOf(attorney.phone)) || null;
      if (!cleanupValue(existing.role.value)) patch.role = extractedField(mapAttorneyRole(valueOf(attorney.side)), confidenceOf(attorney.side));
      if (Object.keys(patch).length > 0) {
        attorneyPatches.push({ attorney_id: existing.attorney_id, patch });
      }
      continue;
    }

    attorneyAdds.push({
      attorney: {
        name: extractedField(attorneyName, confidenceOf(attorney.name)),
        firm: extractedField(orNull(valueOf(attorney.firm)), confidenceOf(attorney.firm)),
        role: extractedField(mapAttorneyRole(valueOf(attorney.side)), confidenceOf(attorney.side)),
        representing: extractedField(orNull(representing), confidenceOf(attorney.representing, attorney.side)),
        bar_number: extractedField(orNull(valueOf(attorney.bar_number)), confidenceOf(attorney.bar_number)),
        address: orNull(valueOf(attorney.address)),
        city: orNull(valueOf(attorney.city)),
        state: orNull(valueOf(attorney.state)),
        zip: orNull(valueOf(attorney.zip)),
        time_used: null,
        email: orNull(valueOf(attorney.email)),
        phone: orNull(valueOf(attorney.phone)),
      },
    });
    pendingAttorneys.add(normalized);
  }
}

function applyPartyExtraction(
  fields: ExtractedNODFields,
  record: CaseRecord,
  partyAdds: PartyAddition[],
  partyPatches: PartyPatch[],
) {
  const parties = fields.parties.length > 0 ? fields.parties : derivePartiesFromCaption(fields);
  const pendingParties = new Map<string, PartyAddition["party"]>();

  for (const party of parties) {
    const name = cleanupValue(valueOf(party.name));
    const role = mapPartyRole(valueOf(party.role));
    if (!name || !role) {
      continue;
    }

    const normalizedName = normalizeName(name);
    if (!normalizedName) {
      continue;
    }

    const pending = pendingParties.get(normalizedName);
    if (pending) {
      mergePartyDraft(
        pending,
        {
          name: extractedField(name, confidenceOf(party.name)),
          role: extractedField(role, confidenceOf(party.role) ?? DEFAULT_CONFIDENCE),
          role_modifier: extractedField(orNull(valueOf(party.role_modifier)), confidenceOf(party.role_modifier)),
          entity_type: extractedField(orNull(valueOf(party.entity_type)), confidenceOf(party.entity_type)),
          fka_or_dba: extractedField(orNull(valueOf(party.fka_or_dba)), confidenceOf(party.fka_or_dba)),
        },
      );
      continue;
    }

    const existing = record.parties.find((item) => normalizeName(item.name.value) === normalizedName);
    if (existing) {
      const patch: Partial<Omit<CaseParty, "party_id">> = {};
      if (!cleanupValue(existing.role.value)) patch.role = extractedField(role, confidenceOf(party.role) ?? DEFAULT_CONFIDENCE);
      if (!cleanupValue(existing.role_modifier.value)) patch.role_modifier = extractedField(orNull(valueOf(party.role_modifier)), confidenceOf(party.role_modifier));
      if (!cleanupValue(existing.entity_type.value)) patch.entity_type = extractedField(orNull(valueOf(party.entity_type)), confidenceOf(party.entity_type));
      if (!cleanupValue(existing.fka_or_dba.value)) patch.fka_or_dba = extractedField(orNull(valueOf(party.fka_or_dba)), confidenceOf(party.fka_or_dba));
      if (Object.keys(patch).length > 0) {
        partyPatches.push({ party_id: existing.party_id, patch });
      }
      continue;
    }

    const nextParty: Omit<CaseParty, "party_id"> = {
      name: extractedField(name, confidenceOf(party.name)),
      role: extractedField(role, confidenceOf(party.role) ?? DEFAULT_CONFIDENCE),
      role_modifier: extractedField(orNull(valueOf(party.role_modifier)), confidenceOf(party.role_modifier)),
      entity_type: extractedField(orNull(valueOf(party.entity_type)), confidenceOf(party.entity_type)),
      fka_or_dba: extractedField(orNull(valueOf(party.fka_or_dba)), confidenceOf(party.fka_or_dba)),
    };
    partyAdds.push({ party: nextParty });
    pendingParties.set(normalizedName, nextParty);
  }
}

function applyLawFirmExtraction(
  fields: ExtractedNODFields,
  record: CaseRecord,
  lawFirmAdds: LawFirmAddition[],
  lawFirmPatches: LawFirmPatch[],
) {
  const lawFirms = fields.law_firms.length > 0 ? fields.law_firms : deriveLawFirmsFromAttorneys(fields);

  for (const lawFirm of lawFirms) {
    const name = cleanupValue(valueOf(lawFirm.name));
    if (!name) {
      continue;
    }

    const existing = record.law_firms.find((item) => normalizeName(item.name.value) === normalizeName(name));
    if (existing) {
      const patch: Partial<Omit<LawFirm, "law_firm_id">> = {};
      if (!cleanupValue(existing.address.value)) patch.address = extractedField(orNull(valueOf(lawFirm.address)), confidenceOf(lawFirm.address));
      if (!cleanupValue(existing.city.value)) patch.city = extractedField(orNull(valueOf(lawFirm.city)), confidenceOf(lawFirm.city));
      if (!cleanupValue(existing.state.value)) patch.state = extractedField(orNull(valueOf(lawFirm.state)), confidenceOf(lawFirm.state));
      if (!cleanupValue(existing.zip.value)) patch.zip = extractedField(orNull(valueOf(lawFirm.zip)), confidenceOf(lawFirm.zip));
      if (!cleanupValue(existing.phone.value)) patch.phone = extractedField(orNull(valueOf(lawFirm.phone)), confidenceOf(lawFirm.phone));
      if (!cleanupValue(existing.fax.value)) patch.fax = extractedField(orNull(valueOf(lawFirm.fax)), confidenceOf(lawFirm.fax));
      if (!cleanupValue(existing.email.value)) patch.email = extractedField(orNull(valueOf(lawFirm.email)), confidenceOf(lawFirm.email));
      if (!cleanupValue(existing.represented_party.value)) patch.represented_party = extractedField(orNull(valueOf(lawFirm.represented_party)), confidenceOf(lawFirm.represented_party));
      if (Object.keys(patch).length > 0) {
        lawFirmPatches.push({ law_firm_id: existing.law_firm_id, patch });
      }
      continue;
    }

    lawFirmAdds.push({
      law_firm: {
        name: extractedField(name, confidenceOf(lawFirm.name)),
        address: extractedField(orNull(valueOf(lawFirm.address)), confidenceOf(lawFirm.address)),
        city: extractedField(orNull(valueOf(lawFirm.city)), confidenceOf(lawFirm.city)),
        state: extractedField(orNull(valueOf(lawFirm.state)), confidenceOf(lawFirm.state)),
        zip: extractedField(orNull(valueOf(lawFirm.zip)), confidenceOf(lawFirm.zip)),
        phone: extractedField(orNull(valueOf(lawFirm.phone)), confidenceOf(lawFirm.phone)),
        fax: extractedField(orNull(valueOf(lawFirm.fax)), confidenceOf(lawFirm.fax)),
        email: extractedField(orNull(valueOf(lawFirm.email)), confidenceOf(lawFirm.email)),
        represented_party: extractedField(orNull(valueOf(lawFirm.represented_party)), confidenceOf(lawFirm.represented_party)),
      },
    });
  }
}

function resolveLocation(fields: ExtractedNODFields) {
  const remote = Boolean(valueOf(fields.remote.is_remote));
  const platform = cleanupValue(valueOf(fields.remote.platform));
  const rawAddress = cleanupValue(valueOf(fields.location.address));
  const rawCity = cleanupValue(valueOf(fields.location.city));
  const rawState = cleanupValue(valueOf(fields.location.state));
  const rawZip = cleanupValue(valueOf(fields.location.zip));
  const caseState = normalizeState(valueOf(fields.state));

  if (remote || (!rawAddress && platform)) {
    const remoteAddress = platform ? `Remote via ${platform}` : "Remote";
    return {
      address: withConfidence(remoteAddress, confidenceOf(fields.remote.platform, fields.remote.is_remote)),
      city: withConfidence("", null),
      state: withConfidence("", null),
      zip: withConfidence(null, null),
    };
  }

  return {
    address: withConfidence(rawAddress, confidenceOf(fields.location.address)),
    city: withConfidence(rawCity, confidenceOf(fields.location.city)),
    state: withConfidence(rawState || caseState, confidenceOf(fields.location.state, fields.state)),
    zip: withConfidence(orNull(rawZip), confidenceOf(fields.location.zip)),
  };
}

function composeCourtName(fields: ExtractedNODFields): string {
  return [
    cleanupValue(valueOf(fields.court_name)),
    cleanupValue(valueOf(fields.district)),
    cleanupValue(valueOf(fields.division)),
  ].filter(Boolean).join(", ");
}

function composeVenue(fields: ExtractedNODFields): string {
  return cleanupValue(valueOf(fields.division))
    || cleanupValue(valueOf(fields.district))
    || cleanupValue(valueOf(fields.county))
    || cleanupValue(valueOf(fields.state));
}

function mapReportingMethod(fields: ExtractedNODFields): CaseRecord["session"]["reporting_method"]["value"] {
  const normalizedMethod = valueOf(fields.reporting_method);
  if (
    normalizedMethod === "machine_shorthand"
    || normalizedMethod === "zoom"
    || normalizedMethod === "in_person"
    || normalizedMethod === "audio_recording"
  ) {
    return normalizedMethod;
  }

  const rawMethod = cleanupValue(normalizedMethod).toLowerCase();
  const remote = Boolean(valueOf(fields.remote.is_remote));
  const platform = cleanupValue(valueOf(fields.remote.platform)).toLowerCase();
  if (remote || platform === "zoom" || rawMethod.includes("zoom")) return "zoom";
  if (rawMethod.includes("audio")) return "audio_recording";
  if (rawMethod.includes("machine")) return "machine_shorthand";
  return "in_person";
}

function mapPartyAffiliation(value: string | null): "plaintiff" | "defendant" | "third_party" | null {
  const normalized = cleanupValue(value).toLowerCase();
  if (normalized.includes("plaintiff")) return "plaintiff";
  if (normalized.includes("defendant") || normalized.includes("defense")) return "defendant";
  if (normalized.includes("third")) return "third_party";
  return null;
}

function mapPartyRole(value: string | null): CaseParty["role"]["value"] | null {
  const normalized = cleanupValue(value).toLowerCase();
  if (normalized === "plaintiff") return "plaintiff";
  if (normalized === "defendant" || normalized === "defense") return "defendant";
  if (normalized === "third_party" || normalized === "third party") return "third_party";
  if (normalized === "cross_plaintiff" || normalized === "cross plaintiff") return "cross_plaintiff";
  if (normalized === "cross_defendant" || normalized === "cross defendant") return "cross_defendant";
  if (normalized === "witness") return "witness";
  if (normalized === "other") return "other";
  return null;
}

function mapWitnessRole(value: string | null): Witness["role"]["value"] | null {
  const normalized = cleanupValue(value).toLowerCase();
  if (normalized === "party") return "PARTY";
  if (normalized === "expert") return "EXPERT";
  if (normalized === "other") return "OTHER";
  if (normalized === "witness" || normalized.includes("deponent")) return "WITNESS";
  return null;
}

function mapReadAndSign(value: string | null): Witness["read_and_sign"]["value"] {
  const normalized = cleanupValue(value).toLowerCase();
  if (normalized.includes("waiv")) return "waived";
  if (normalized.includes("read")) return "read_and_sign";
  return null;
}

function mapJurisdictionType(
  explicit: string | null,
  state: string | null,
  courtName: string | null,
): CaseRecord["caption"]["jurisdiction_type"]["value"] {
  const normalized = cleanupValue(explicit).toLowerCase();
  if (normalized === "texas_state" || normalized === "federal" || normalized === "state" || normalized === "other") {
    return normalized;
  }
  const normalizedCourt = cleanupValue(courtName).toLowerCase();
  const normalizedState = cleanupValue(state).toLowerCase();
  if (normalizedCourt.includes("united states") || normalizedCourt.includes("district court")) {
    return "federal";
  }
  if (normalizedState === "texas" || normalizedState === "tx") {
    return "texas_state";
  }
  if (normalizedState) {
    return "state";
  }
  return null;
}

function mapLocationType(fields: ExtractedNODFields): CaseRecord["session"]["location_type"]["value"] {
  const platform = cleanupValue(valueOf(fields.remote.platform)).toLowerCase();
  const remote = Boolean(valueOf(fields.remote.is_remote));
  const hasAddress = Boolean(cleanupValue(valueOf(fields.location.address)));
  if (platform.includes("phone") || platform.includes("telephone")) return "phone";
  if (remote && hasAddress) return "hybrid";
  if (remote) return "zoom";
  return "in_person";
}

function composeRepresenting(
  attorney: ExtractedAttorney,
  plaintiff: string,
  defenseParties: string[],
): string {
  const explicit = cleanupValue(valueOf(attorney.representing));
  if (explicit) {
    return explicit;
  }

  const side = valueOf(attorney.side);
  if (side === "plaintiff") {
    return plaintiff ? `FOR PLAINTIFF ${plaintiff.toUpperCase()}` : "FOR THE PLAINTIFF";
  }
  if (side === "defense") {
    const party = defenseParties[0] ? cleanupValue(defenseParties[0]) : "";
    return party ? `FOR DEFENDANT ${party.toUpperCase()}` : "FOR THE DEFENDANT";
  }
  return "";
}

function derivePartiesFromCaption(fields: ExtractedNODFields): ExtractedParty[] {
  const derived: ExtractedParty[] = [];
  const plaintiff = cleanupValue(valueOf(fields.plaintiff));
  if (plaintiff) {
    derived.push({
      name: withConfidence(plaintiff, confidenceOf(fields.plaintiff)),
      role: withConfidence("plaintiff", confidenceOf(fields.plaintiff)),
      role_modifier: withConfidence(null, null),
      entity_type: withConfidence(inferEntityType(plaintiff), 0.5),
      fka_or_dba: withConfidence(extractDbaFragment(plaintiff), 0.6),
    });
  }

  for (const defendant of valueOf(fields.defendants) ?? []) {
    const normalized = cleanupValue(defendant);
    if (!normalized) {
      continue;
    }
    derived.push({
      name: withConfidence(normalized, confidenceOf(fields.defendants)),
      role: withConfidence("defendant", confidenceOf(fields.defendants)),
      role_modifier: withConfidence(null, null),
      entity_type: withConfidence(inferEntityType(normalized), 0.5),
      fka_or_dba: withConfidence(extractDbaFragment(normalized), 0.6),
    });
  }

  return derived;
}

function deriveLawFirmsFromAttorneys(fields: ExtractedNODFields): ExtractedLawFirm[] {
  const byName = new Map<string, ExtractedLawFirm>();
  for (const attorney of fields.attorneys) {
    const firmName = cleanupValue(valueOf(attorney.firm));
    if (!firmName) {
      continue;
    }
    const key = normalizeName(firmName);
    if (!byName.has(key)) {
      byName.set(key, {
        name: withConfidence(firmName, confidenceOf(attorney.firm)),
        address: withConfidence(orNull(valueOf(attorney.address)), confidenceOf(attorney.address)),
        city: withConfidence(orNull(valueOf(attorney.city)), confidenceOf(attorney.city)),
        state: withConfidence(orNull(valueOf(attorney.state)), confidenceOf(attorney.state)),
        zip: withConfidence(orNull(valueOf(attorney.zip)), confidenceOf(attorney.zip)),
        phone: withConfidence(orNull(valueOf(attorney.phone)), confidenceOf(attorney.phone)),
        fax: withConfidence(null, null),
        email: withConfidence(orNull(valueOf(attorney.email)), confidenceOf(attorney.email)),
        represented_party: withConfidence(orNull(composeRepresenting(attorney, cleanupValue(valueOf(fields.plaintiff)), valueOf(fields.defendants) ?? [])), confidenceOf(attorney.representing)),
      });
    }
  }
  return [...byName.values()];
}

function mergePartyDraft(
  target: Omit<CaseParty, "party_id">,
  incoming: Omit<CaseParty, "party_id">,
) {
  if (!cleanupValue(target.role.value)) target.role = incoming.role;
  if (!cleanupValue(target.role_modifier.value)) target.role_modifier = incoming.role_modifier;
  if (!cleanupValue(target.entity_type.value)) target.entity_type = incoming.entity_type;
  if (!cleanupValue(target.fka_or_dba.value)) target.fka_or_dba = incoming.fka_or_dba;
}

function buildKeyterms(fields: ExtractedNODFields): DeepgramKeyterm[] {
  const terms: Array<{ term: string; category: DeepgramKeyterm["category"] }> = [];
  pushTerm(terms, valueOf(fields.witness.name), "proper_name");
  pushTerm(terms, valueOf(fields.case_style), "legal_term");
  pushTerm(terms, valueOf(fields.plaintiff), "proper_name");
  for (const party of fields.parties) {
    pushTerm(terms, valueOf(party.name), "proper_name");
  }
  for (const defendant of valueOf(fields.defendants) ?? []) {
    pushTerm(terms, defendant, "company");
  }
  for (const attorney of fields.attorneys) {
    pushTerm(terms, valueOf(attorney.name), "proper_name");
    pushTerm(terms, valueOf(attorney.firm), "company");
  }
  for (const lawFirm of fields.law_firms) {
    pushTerm(terms, valueOf(lawFirm.name), "company");
  }
  for (const participant of fields.other_participants) {
    pushTerm(terms, valueOf(participant.name), "proper_name");
  }
  pushTerm(terms, valueOf(fields.scheduling.ordered_by), "proper_name");
  pushTerm(terms, valueOf(fields.scheduling.scheduler), "proper_name");
  const schedulingContact = valueOf(fields.scheduling.scheduling_contact);
  if (schedulingContact && !schedulingContact.includes("@")) {
    pushTerm(terms, schedulingContact, "proper_name");
  }

  const seen = new Set<string>();
  const result: DeepgramKeyterm[] = [];
  for (const term of terms) {
    const normalized = cleanupValue(term.term).toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push({
      term: cleanupValue(term.term),
      boost: 0.5,
      category: term.category,
      notes: "Extracted from Notice of Deposition",
    });
  }
  return result;
}

function pushTerm(
  terms: Array<{ term: string; category: DeepgramKeyterm["category"] }>,
  value: string | null,
  category: DeepgramKeyterm["category"],
) {
  const normalized = cleanupValue(value);
  if (normalized) {
    terms.push({ term: normalized, category });
  }
}

function queueField(
  updates: ExtractionFieldUpdate[],
  conflicts: ExtractionConflict[],
  record: CaseRecord,
  path: string,
  incoming: ExtractedConfidenceValue<unknown>,
  label: string,
) {
  const cleanedValue = sanitizeValue(incoming.value);
  if (isEmpty(cleanedValue)) {
    return;
  }

  const current = getField(record, path);
  if (!current) {
    return;
  }

  if (sameValue(current.value, cleanedValue)) {
    return;
  }

  if (current.confirmed && !isEmpty(current.value)) {
    conflicts.push({
      path,
      label,
      currentValue: String(current.value),
      currentSource: current.source,
      incomingValue: String(cleanedValue),
      incomingConfidence: clampConfidence(incoming.confidence),
    });
    return;
  }

  updates.push({
    path,
    value: cleanedValue,
    confidence_score: clampConfidence(incoming.confidence),
    label,
  });
}

function getField(record: CaseRecord, path: string) {
  const keys = path
    .split(".")
    .flatMap((segment) => {
      const match = segment.match(/^([^[]+)\[(\d+)\]$/);
      return match ? [match[1], match[2]] : [segment];
    });

  let node: unknown = record;
  for (const key of keys) {
    if (node == null || typeof node !== "object") return null;
    node = (node as Record<string, unknown>)[key];
  }
  if (node == null || typeof node !== "object" || !("value" in node)) return null;
  return node as { value: unknown; source: FieldSource; confirmed: boolean };
}

function extractedField<T>(value: T, confidence_score: number | null) {
  return {
    value,
    source: "extracted" as const,
    confirmed: false,
    conflict: false,
    confidence_score: clampConfidence(confidence_score),
  };
}

function withConfidence<T>(value: T, confidence: number | null): ExtractedConfidenceValue<T> {
  return {
    value,
    confidence: clampConfidence(confidence),
  };
}

function valueOf<T>(field: ExtractedConfidenceValue<T>): T | null {
  return field.value;
}

// The model supplies field-level confidence. We clamp it into [0, 1] and use 0.7
// as the fallback when the model omitted a score for an otherwise usable value.
function confidenceOf(...fields: Array<ExtractedConfidenceValue<unknown>>): number | null {
  for (const field of fields) {
    if (field.confidence != null) {
      return clampConfidence(field.confidence);
    }
  }
  return fields.some((field) => !isEmpty(sanitizeValue(field.value))) ? DEFAULT_CONFIDENCE : null;
}

function maxConfidence(...fields: Array<ExtractedConfidenceValue<unknown>>): number | null {
  const values = fields
    .map((field) => confidenceOf(field))
    .filter((value): value is number => value != null);
  if (values.length === 0) {
    return null;
  }
  return Math.max(...values);
}

function clampConfidence(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  return Math.max(0, Math.min(1, value));
}

function mapAttorneyRole(side: "plaintiff" | "defense" | "other" | null): Attorney["role"]["value"] {
  if (side === "plaintiff") return "EXAMINING";
  if (side === "defense") return "OPPOSING";
  return "OTHER";
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return cleanupValue(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  return value;
}

function normalizeCounty(county: string | null): string {
  const normalized = cleanupValue(county);
  if (!normalized) return "";
  return /county$/i.test(normalized) ? normalized : `${normalized} County`;
}

function normalizeState(state: string | null): string {
  const normalized = cleanupValue(state);
  if (!normalized) return "";
  return normalized.length === 2 ? normalized.toUpperCase() : normalized;
}

function normalizeISODate(value: string | null): string {
  const normalized = cleanupValue(value);
  if (!normalized) return "";
  return normalized;
}

function normalizeISOTime(value: string | null): string | null {
  const normalized = cleanupValue(value);
  if (!normalized) return null;
  return normalized;
}

function normalizeName(value: string | null | undefined): string {
  return cleanupValue(value).toLowerCase();
}

function inferEntityType(value: string | null): string | null {
  const normalized = cleanupValue(value).toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("llc")) return "llc";
  if (normalized.includes("inc") || normalized.includes("corp")) return "corporation";
  if (normalized.includes("l.p.") || normalized.includes("lp") || normalized.includes("llp") || normalized.includes("pllc")) return "partnership";
  return "individual";
}

function extractDbaFragment(value: string | null): string | null {
  const normalized = cleanupValue(value);
  if (!normalized) return null;
  const match = normalized.match(/\b(?:d\/b\/a|dba|f\/k\/a|fka)\b.*$/i);
  return match ? cleanupValue(match[0]) : null;
}

function cleanupValue(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && cleanupValue(value) === "");
}

function orNull(value: string | null | undefined): string | null {
  const normalized = cleanupValue(value);
  return normalized || null;
}
