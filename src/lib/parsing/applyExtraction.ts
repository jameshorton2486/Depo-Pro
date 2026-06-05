import type { Attorney, CaseRecord, DeepgramKeyterm, FieldSource, Witness } from "../../types/case";
import type { ParsedNOD, AttorneyAppearance } from "./parserTypes";

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

const CONFIDENCE = {
  exact: 0.9,
  inferred: 0.75,
  weak: 0.6,
} as const;

export function applyExtraction(parsed: ParsedNOD, record: CaseRecord): ExtractionApplication {
  const fieldUpdates: ExtractionFieldUpdate[] = [];
  const conflicts: ExtractionConflict[] = [];
  const attorneyAdds: AttorneyAddition[] = [];
  const attorneyPatches: AttorneyPatch[] = [];
  const witnessAdds: WitnessAddition[] = [];
  const witnessPatches: WitnessPatch[] = [];

  queueField(fieldUpdates, conflicts, record, "caption.case_number", parsed.caseInfo.causeNumber, CONFIDENCE.exact, "Case Number");
  queueField(fieldUpdates, conflicts, record, "caption.case_style", parsed.caseInfo.caseStyle, CONFIDENCE.inferred, "Case Style");
  if (!record.caption.case_name.value) {
    queueField(fieldUpdates, conflicts, record, "caption.case_name", parsed.caseInfo.caseStyle, CONFIDENCE.inferred, "Case Name");
  }

  const courtName = composeCourtName(parsed);
  queueField(fieldUpdates, conflicts, record, "caption.court_name", courtName, courtName === parsed.caseInfo.court ? CONFIDENCE.exact : CONFIDENCE.inferred, "Court Name");
  queueField(fieldUpdates, conflicts, record, "caption.county", normalizeCounty(parsed.caseInfo.county), CONFIDENCE.exact, "County");
  queueField(fieldUpdates, conflicts, record, "caption.venue", composeVenue(parsed), CONFIDENCE.weak, "Venue");

  queueField(fieldUpdates, conflicts, record, "session.deposition_date", toISODate(parsed.depositionDetails.date), CONFIDENCE.exact, "Deposition Date");
  queueField(fieldUpdates, conflicts, record, "session.start_time", toISOTime(parsed.depositionDetails.time), CONFIDENCE.exact, "Start Time");

  const location = parseLocation(parsed.depositionDetails.location, parsed.caseInfo);
  queueField(fieldUpdates, conflicts, record, "session.location_address", location.address, CONFIDENCE.inferred, "Address");
  queueField(fieldUpdates, conflicts, record, "session.location_city", location.city, CONFIDENCE.inferred, "City");
  queueField(fieldUpdates, conflicts, record, "session.location_state", location.state, CONFIDENCE.inferred, "State");
  queueField(fieldUpdates, conflicts, record, "session.location_zip", location.zip, CONFIDENCE.inferred, "ZIP Code");
  queueField(fieldUpdates, conflicts, record, "session.location_county", location.county, location.county ? CONFIDENCE.inferred : null, "County");
  queueField(fieldUpdates, conflicts, record, "session.reporting_method", mapReportingMethod(parsed.depositionDetails), CONFIDENCE.exact, "Reporting Method");

  applyWitnessExtraction(parsed, record, fieldUpdates, conflicts, witnessAdds);
  applyAttorneyExtraction(parsed.appearances, record, attorneyAdds, attorneyPatches);

  const keyterms = toDeepgramKeyterms(parsed.deepgramKeyterms);

  return {
    fieldUpdates,
    attorneyAdds,
    attorneyPatches,
    witnessAdds,
    witnessPatches,
    conflicts,
    keyterms,
  };
}

function applyWitnessExtraction(
  parsed: ParsedNOD,
  record: CaseRecord,
  fieldUpdates: ExtractionFieldUpdate[],
  conflicts: ExtractionConflict[],
  witnessAdds: WitnessAddition[],
) {
  const witnessName = cleanupValue(parsed.depositionDetails.deponent.name);
  const partyAffiliation = inferPartyAffiliation(parsed);
  if (!witnessName && !partyAffiliation) return;

  const existing = record.witnesses[0];
  if (existing) {
    if (witnessName) {
      queueField(fieldUpdates, conflicts, record, "witnesses[0].name", witnessName, CONFIDENCE.inferred, "Witness 1 — Name");
    }
    if (partyAffiliation) {
      queueField(fieldUpdates, conflicts, record, "witnesses[0].party_affiliation", partyAffiliation, CONFIDENCE.weak, "Witness 1 — Party Affiliation");
    }
    return;
  }

  witnessAdds.push({
    witness: {
      name: extractedField(witnessName || ""),
      role: extractedField("WITNESS"),
      title: extractedField(null),
      employer: extractedField(null),
      prefix_suffix: null,
      party_affiliation: extractedField(partyAffiliation),
      is_corporate_rep: false,
      corporate_entity: null,
      read_and_sign: extractedField(null),
      spelling_corrections: [],
      email: null,
      phone: null,
    },
  });
}

function applyAttorneyExtraction(
  appearances: AttorneyAppearance[],
  record: CaseRecord,
  attorneyAdds: AttorneyAddition[],
  attorneyPatches: AttorneyPatch[],
) {
  for (const appearance of appearances) {
    const normalized = normalizeName(appearance.attorneyName);
    if (!normalized) continue;
    const existing = record.attorneys.find((attorney) => normalizeName(attorney.name.value) === normalized);
    const parsedAddress = splitAddress(appearance.address);

    if (existing) {
      const patch: Partial<Omit<Attorney, "attorney_id">> = {};
      if (!existing.firm.value && appearance.firmName) patch.firm = extractedField(appearance.firmName);
      if (!existing.representing.value && appearance.represents) patch.representing = extractedField(appearance.represents);
      if (!existing.bar_number.value && appearance.stateBarNo) patch.bar_number = extractedField(appearance.stateBarNo);
      if (!existing.address && parsedAddress.address) patch.address = parsedAddress.address;
      if (!existing.city && parsedAddress.city) patch.city = parsedAddress.city;
      if (!existing.state && parsedAddress.state) patch.state = parsedAddress.state;
      if (!existing.zip && parsedAddress.zip) patch.zip = parsedAddress.zip;
      if (!existing.email && appearance.email) patch.email = appearance.email;
      if (!existing.phone && appearance.phone) patch.phone = appearance.phone;
      if (!existing.role.value && appearance.side) patch.role = extractedField(mapAttorneyRole(appearance.side));
      if (Object.keys(patch).length > 0) {
        attorneyPatches.push({ attorney_id: existing.attorney_id, patch });
      }
      continue;
    }

    attorneyAdds.push({
      attorney: {
        name: extractedField(appearance.attorneyName),
        firm: extractedField(orNull(appearance.firmName)),
        role: extractedField(mapAttorneyRole(appearance.side)),
        representing: extractedField(orNull(appearance.represents)),
        bar_number: extractedField(orNull(appearance.stateBarNo ?? null)),
        address: parsedAddress.address,
        city: parsedAddress.city,
        state: parsedAddress.state,
        zip: parsedAddress.zip,
        time_used: null,
        email: orNull(appearance.email),
        phone: orNull(appearance.phone),
      },
    });
  }
}

function queueField(
  updates: ExtractionFieldUpdate[],
  conflicts: ExtractionConflict[],
  record: CaseRecord,
  path: string,
  value: unknown,
  confidence_score: number | null,
  label: string,
) {
  const cleanedValue = typeof value === "string" ? cleanupValue(value) : value;
  if (
    cleanedValue === null ||
    cleanedValue === undefined ||
    cleanedValue === ""
  ) {
    return;
  }

  const current = getField(record, path);
  if (!current) return;

  if (sameValue(current.value, cleanedValue)) return;

  if (current.confirmed && !isEmpty(current.value)) {
    conflicts.push({
      path,
      label,
      currentValue: String(current.value),
      currentSource: current.source,
      incomingValue: String(cleanedValue),
      incomingConfidence: confidence_score,
    });
    return;
  }

  updates.push({
    path,
    value: cleanedValue,
    confidence_score,
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

function extractedField<T>(value: T) {
  return {
    value,
    source: "extracted" as const,
    confirmed: false,
    conflict: false,
    confidence_score: null,
  };
}

function inferPartyAffiliation(parsed: ParsedNOD): "plaintiff" | "defendant" | "third_party" | null {
  const role = parsed.depositionDetails.deponent.role.toLowerCase();
  if (role.includes("plaintiff")) return "plaintiff";
  if (role.includes("defendant")) return "defendant";
  return null;
}

function composeCourtName(parsed: ParsedNOD): string {
  return [
    cleanupValue(parsed.caseInfo.court),
    cleanupValue(parsed.caseInfo.district),
    cleanupValue(parsed.caseInfo.division),
  ].filter(Boolean).join(", ");
}

function composeVenue(parsed: ParsedNOD): string {
  return cleanupValue(parsed.caseInfo.division) || cleanupValue(parsed.caseInfo.district) || cleanupValue(parsed.caseInfo.state);
}

function mapReportingMethod(details: ParsedNOD["depositionDetails"]): CaseRecord["session"]["reporting_method"]["value"] {
  if (details.isZoom || details.method === "zoom") return "zoom";
  return "in_person";
}

function parseLocation(location: string, caseInfo: ParsedNOD["caseInfo"]) {
  const normalized = cleanupValue(location);
  if (!normalized) {
    return {
      address: "",
      city: "",
      state: "",
      zip: null as string | null,
      county: normalizeCounty(caseInfo.county),
    };
  }

  const remote = /zoom|teams|webex|remote|videoconference/i.test(normalized);
  if (remote) {
    return {
      address: normalized,
      city: "",
      state: "",
      zip: null as string | null,
      county: normalizeCounty(caseInfo.county),
    };
  }

  const parts = normalized.split(",").map((part) => part.trim()).filter(Boolean);
  const address = parts[0] ?? "";
  const city = parts[1] ?? "";
  const stateZip = parts[2] ?? "";
  const stateZipMatch = stateZip.match(/^([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/i);
  return {
    address,
    city,
    state: stateZipMatch?.[1]?.toUpperCase() ?? "",
    zip: stateZipMatch?.[2] ?? null,
    county: normalizeCounty(caseInfo.county),
  };
}

function splitAddress(address: string) {
  const normalized = cleanupValue(address);
  if (!normalized) {
    return { address: null, city: null, state: null, zip: null };
  }
  const parts = normalized.split(",").map((part) => part.trim()).filter(Boolean);
  const street = parts[0] ?? null;
  const city = parts[1] ?? null;
  const stateZip = parts[2] ?? "";
  const stateZipMatch = stateZip.match(/^([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/i);
  return {
    address: street,
    city,
    state: stateZipMatch?.[1]?.toUpperCase() ?? null,
    zip: stateZipMatch?.[2] ?? null,
  };
}

function normalizeCounty(county: string): string {
  const normalized = cleanupValue(county);
  if (!normalized) return "";
  return /county$/i.test(normalized) ? normalized : `${normalized} County`;
}

function toISODate(raw: string): string {
  const normalized = cleanupValue(raw);
  if (!normalized) return "";
  const slashMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return [
    parsed.getUTCFullYear(),
    String(parsed.getUTCMonth() + 1).padStart(2, "0"),
    String(parsed.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function toISOTime(raw: string): string {
  const normalized = cleanupValue(raw);
  if (!normalized) return "";
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!match) return normalized;
  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function toDeepgramKeyterms(keyterms: string[]): DeepgramKeyterm[] {
  const seen = new Set<string>();
  const result: DeepgramKeyterm[] = [];
  for (const keyterm of keyterms) {
    const term = cleanupValue(keyterm);
    if (!term) continue;
    const normalized = term.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push({
      term,
      boost: 0.5,
      category: "proper_name",
      notes: "Extracted from Notice of Deposition",
    });
  }
  return result;
}

function mapAttorneyRole(side: AttorneyAppearance["side"]): Attorney["role"]["value"] {
  if (side === "Plaintiff") return "EXAMINING";
  if (side === "Defendant") return "OPPOSING";
  return "OTHER";
}

function normalizeName(value: string | null | undefined): string {
  return cleanupValue(value).toLowerCase();
}

function cleanupValue(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && cleanupValue(value) === "");
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function orNull(value: string | null | undefined): string | null {
  const normalized = cleanupValue(value);
  return normalized || null;
}
