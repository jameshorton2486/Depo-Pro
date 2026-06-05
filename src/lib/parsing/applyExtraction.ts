import type { Attorney, CaseRecord, DeepgramKeyterm, FieldSource, Witness } from "../../types/case";
import type {
  ExtractedAttorney,
  ExtractedConfidenceValue,
  ExtractedNODFields,
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

export interface ExtractionApplication {
  fieldUpdates: ExtractionFieldUpdate[];
  attorneyAdds: AttorneyAddition[];
  attorneyPatches: AttorneyPatch[];
  witnessAdds: WitnessAddition[];
  witnessPatches: WitnessPatch[];
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
  queueField(fieldUpdates, conflicts, record, "caption.county", withConfidence(normalizeCounty(valueOf(fields.county)), confidenceOf(fields.county)), "County");
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

  applyWitnessExtraction(fields, record, fieldUpdates, conflicts, witnessAdds);
  applyAttorneyExtraction(fields, record, attorneyAdds, attorneyPatches);

  return {
    fieldUpdates,
    attorneyAdds,
    attorneyPatches,
    witnessAdds,
    witnessPatches,
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
  if (!witnessName && !partyAffiliation) {
    return;
  }

  const existing = record.witnesses[0];
  if (existing) {
    if (witnessName) {
      queueField(fieldUpdates, conflicts, record, "witnesses[0].name", withConfidence(witnessName, confidenceOf(fields.witness.name)), "Witness 1 - Name");
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
    return;
  }

  witnessAdds.push({
    witness: {
      name: extractedField(witnessName, confidenceOf(fields.witness.name)),
      role: extractedField("WITNESS", DEFAULT_CONFIDENCE),
      title: extractedField(null, null),
      employer: extractedField(null, null),
      prefix_suffix: null,
      party_affiliation: extractedField(partyAffiliation, confidenceOf(fields.witness.party_affiliation)),
      is_corporate_rep: false,
      corporate_entity: null,
      read_and_sign: extractedField(null, null),
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

  for (const attorney of fields.attorneys) {
    const attorneyName = cleanupValue(valueOf(attorney.name));
    if (!attorneyName) {
      continue;
    }

    const normalized = normalizeName(attorneyName);
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
  const rawMethod = cleanupValue(valueOf(fields.reporting_method)).toLowerCase();
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

function buildKeyterms(fields: ExtractedNODFields): DeepgramKeyterm[] {
  const terms: Array<{ term: string; category: DeepgramKeyterm["category"] }> = [];
  pushTerm(terms, valueOf(fields.witness.name), "proper_name");
  pushTerm(terms, valueOf(fields.case_style), "legal_term");
  pushTerm(terms, valueOf(fields.plaintiff), "proper_name");
  for (const defendant of valueOf(fields.defendants) ?? []) {
    pushTerm(terms, defendant, "company");
  }
  for (const attorney of fields.attorneys) {
    pushTerm(terms, valueOf(attorney.name), "proper_name");
    pushTerm(terms, valueOf(attorney.firm), "company");
  }
  for (const participant of fields.other_participants) {
    pushTerm(terms, valueOf(participant.name), "proper_name");
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
      const match = segment.match(/^([^\[]+)\[(\d+)\]$/);
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
