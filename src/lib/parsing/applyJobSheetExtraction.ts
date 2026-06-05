import type { Attorney, CaseRecord, DeepgramKeyterm, Witness } from "../../types/case";
import type { ParsedReporterNotes } from "./parserTypes";
import type {
  AttorneyAddition,
  ExtractionApplication,
  ExtractionConflict,
  ExtractionFieldUpdate,
  WitnessPatch,
} from "./applyExtraction";

type PlainAttorneyPatch = {
  attorney_id: string;
  patch: Partial<Omit<Attorney, "attorney_id">>;
};

export interface JobSheetExtractionResult {
  application: ExtractionApplication;
  droppedPaths: string[];
}

const DEFAULT_CONFIDENCE = 0.7;

function extractedField<T>(value: T, confidence_score: number | null) {
  return {
    value,
    source: "extracted" as const,
    confirmed: false,
    conflict: false,
    confidence_score,
  };
}

function sanitizeText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeName(value: string | null | undefined): string {
  return sanitizeText(value).toLowerCase();
}

function normalizeISODate(value: string | null | undefined): string {
  const text = sanitizeText(value);
  if (!text) {
    return "";
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return text;
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return text;
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeISOTime(value: string | null | undefined): string | null {
  const text = sanitizeText(value).toUpperCase();
  if (!text) {
    return null;
  }

  const match = text.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/);
  if (!match) {
    return text;
  }

  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3] ?? null;

  if (meridiem === "PM" && hours < 12) {
    hours += 12;
  }
  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function splitAddress(value: string | null | undefined) {
  const text = sanitizeText(value);
  if (!text) {
    return {
      address: "",
      city: "",
      state: "",
      zip: null as string | null,
    };
  }

  const match = text.match(/^(.*?)(?:,\s*|\s+)([A-Za-z .'-]+),?\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (!match) {
    return {
      address: text,
      city: "",
      state: "",
      zip: null,
    };
  }

  return {
    address: sanitizeText(match[1]),
    city: sanitizeText(match[2]),
    state: sanitizeText(match[3]),
    zip: sanitizeText(match[4]) || null,
  };
}

function deriveLocation(job: ParsedReporterNotes["jobDetails"]) {
  const rawLocation = sanitizeText(job.location);
  const zoom = /\bzoom\b/i.test(rawLocation);
  const addressParts = splitAddress(rawLocation.replace(/\bvia\s+zoom\b/i, "").replace(/\bzoom\b/i, "").replace(/[/-]+/g, " "));

  return {
    address: zoom
      ? `Via Zoom${addressParts.city || addressParts.state ? ` / ${[addressParts.city, addressParts.state].filter(Boolean).join(", ")}` : ""}`
      : rawLocation,
    city: addressParts.city,
    state: addressParts.state,
    zip: addressParts.zip,
    isRemote: zoom,
    remotePlatform: zoom ? "Zoom" : null,
    reportingMethod: zoom ? "zoom" : job.csr ? "machine_shorthand" : "in_person",
  } as const;
}

function getExtractedField(record: CaseRecord, path: string) {
  const keys = path
    .split(".")
    .flatMap((segment) => {
      const match = segment.match(/^([^\[]+)\[(\d+)\]$/);
      return match ? [match[1], match[2]] : [segment];
    });

  let node: unknown = record;
  for (const key of keys) {
    if (node == null || typeof node !== "object") {
      return null;
    }
    node = (node as Record<string, unknown>)[key];
  }

  if (node == null || typeof node !== "object" || !("value" in node)) {
    return null;
  }

  return node as { value: unknown; source: "manual" | "extracted" | "imported"; confirmed: boolean };
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function queueExtractedField(
  updates: ExtractionFieldUpdate[],
  conflicts: ExtractionConflict[],
  record: CaseRecord,
  path: string,
  value: unknown,
  confidence: number | null,
  label: string,
) {
  if (value == null || value === "") {
    return;
  }

  const current = getExtractedField(record, path);
  if (!current) {
    return;
  }

  if (sameValue(current.value, value)) {
    return;
  }

  if (current.confirmed && current.value !== null && current.value !== "") {
    conflicts.push({
      path,
      label,
      currentValue: String(current.value),
      currentSource: current.source,
      incomingValue: String(value),
      incomingConfidence: confidence,
    });
    return;
  }

  updates.push({
    path,
    value,
    confidence_score: confidence,
    label,
  });
}

function buildAttorneyCandidate(
  name: string,
  firm: string,
  address: string,
  phone: string,
  email: string,
) {
  const split = splitAddress(address);
  return {
    name: sanitizeText(name),
    firm: sanitizeText(firm) || null,
    address: split.address || null,
    city: split.city || null,
    state: split.state || null,
    zip: split.zip,
    phone: sanitizeText(phone) || null,
    email: sanitizeText(email) || null,
  };
}

function applyAttorneyCandidate(
  record: CaseRecord,
  fieldUpdates: ExtractionFieldUpdate[],
  conflicts: ExtractionConflict[],
  attorneyAdds: AttorneyAddition[],
  plainPatches: PlainAttorneyPatch[],
  candidate: ReturnType<typeof buildAttorneyCandidate>,
  confidence: number | null,
) {
  if (!candidate.name) {
    return;
  }

  const existing = record.attorneys.find((attorney) => normalizeName(attorney.name.value) === normalizeName(candidate.name));
  if (!existing) {
    attorneyAdds.push({
      attorney: {
        name: extractedField(candidate.name, confidence),
        firm: extractedField(candidate.firm, confidence),
        role: extractedField("OTHER", confidence),
        representing: extractedField(null, null),
        bar_number: extractedField(null, null),
        address: candidate.address,
        city: candidate.city,
        state: candidate.state,
        zip: candidate.zip,
        time_used: null,
        email: candidate.email,
        phone: candidate.phone,
      },
    });
    return;
  }

  queueExtractedField(fieldUpdates, conflicts, record, `attorneys[${record.attorneys.indexOf(existing)}].name`, candidate.name, confidence, "Attorney Name");
  if (candidate.firm) {
    queueExtractedField(fieldUpdates, conflicts, record, `attorneys[${record.attorneys.indexOf(existing)}].firm`, candidate.firm, confidence, "Attorney Firm");
  }

  const plainPatch: Partial<Omit<Attorney, "attorney_id">> = {};
  if (!existing.address && candidate.address) plainPatch.address = candidate.address;
  if (!existing.city && candidate.city) plainPatch.city = candidate.city;
  if (!existing.state && candidate.state) plainPatch.state = candidate.state;
  if (!existing.zip && candidate.zip) plainPatch.zip = candidate.zip;
  if (!existing.phone && candidate.phone) plainPatch.phone = candidate.phone;
  if (!existing.email && candidate.email) plainPatch.email = candidate.email;

  if (Object.keys(plainPatch).length > 0) {
    plainPatches.push({ attorney_id: existing.attorney_id, patch: plainPatch });
  }
}

function mergeAttorneyPatches(plainPatches: PlainAttorneyPatch[]) {
  const merged = new Map<string, Partial<Omit<Attorney, "attorney_id">>>();

  for (const patch of plainPatches) {
    merged.set(patch.attorney_id, { ...(merged.get(patch.attorney_id) ?? {}), ...patch.patch });
  }

  return Array.from(merged.entries()).map(([attorney_id, patch]) => ({
    attorney_id,
    patch,
  }));
}

export function applyJobSheetExtraction(
  parsed: ParsedReporterNotes,
  record: CaseRecord,
): JobSheetExtractionResult {
  const fieldUpdates: ExtractionFieldUpdate[] = [];
  const conflicts: ExtractionConflict[] = [];
  const attorneyAdds: AttorneyAddition[] = [];
  const plainAttorneyPatches: PlainAttorneyPatch[] = [];
  const witnessPatches: WitnessPatch[] = [];
  const droppedPaths: string[] = [];

  const location = deriveLocation(parsed.jobDetails);

  queueExtractedField(
    fieldUpdates,
    conflicts,
    record,
    "session.deposition_date",
    normalizeISODate(parsed.jobDetails.date),
    DEFAULT_CONFIDENCE,
    "Deposition Date",
  );
  queueExtractedField(
    fieldUpdates,
    conflicts,
    record,
    "session.start_time",
    normalizeISOTime(parsed.jobDetails.scheduledStartTime),
    DEFAULT_CONFIDENCE,
    "Start Time",
  );
  queueExtractedField(
    fieldUpdates,
    conflicts,
    record,
    "session.location_address",
    location.address,
    DEFAULT_CONFIDENCE,
    "Address",
  );
  queueExtractedField(
    fieldUpdates,
    conflicts,
    record,
    "session.location_city",
    location.city,
    DEFAULT_CONFIDENCE,
    "City",
  );
  queueExtractedField(
    fieldUpdates,
    conflicts,
    record,
    "session.location_state",
    location.state,
    DEFAULT_CONFIDENCE,
    "State",
  );
  queueExtractedField(
    fieldUpdates,
    conflicts,
    record,
    "session.location_zip",
    location.zip,
    DEFAULT_CONFIDENCE,
    "ZIP Code",
  );
  queueExtractedField(
    fieldUpdates,
    conflicts,
    record,
    "session.reporting_method",
    location.reportingMethod,
    DEFAULT_CONFIDENCE,
    "Reporting Method",
  );

  if (record.witnesses[0]) {
    witnessPatches.push({
      witness_id: record.witnesses[0].witness_id,
      patch: {
        read_and_sign: extractedField(
          parsed.jobDetails.signatureWaived ? "waived" : parsed.jobDetails.readAndSign ? "read_and_sign" : null,
          DEFAULT_CONFIDENCE,
        ) as Witness["read_and_sign"],
      },
    });
  }

  applyAttorneyCandidate(
    record,
    fieldUpdates,
    conflicts,
    attorneyAdds,
    plainAttorneyPatches,
    buildAttorneyCandidate(
      parsed.billing.orderingAttorney,
      parsed.billing.orderingFirm,
      parsed.billing.orderingAddress,
      parsed.billing.orderingPhone,
      parsed.billing.orderingEmail,
    ),
    DEFAULT_CONFIDENCE,
  );

  for (const copy of parsed.billing.copyOrders) {
    applyAttorneyCandidate(
      record,
      fieldUpdates,
      conflicts,
      attorneyAdds,
      plainAttorneyPatches,
      buildAttorneyCandidate(
        copy.attorneyName,
        copy.firmName,
        copy.address,
        copy.phone,
        copy.email,
      ),
      DEFAULT_CONFIDENCE,
    );
  }

  if (parsed.billing.delivery) {
    droppedPaths.push("billing.delivery");
  }
  if (parsed.billing.rushDue) {
    droppedPaths.push("billing.rushDue");
  }
  if (parsed.jobDetails.csr || parsed.jobDetails.conferenceRoom) {
    droppedPaths.push("jobDetails.serviceType");
  }
  if (parsed.billing.orderedBy) {
    droppedPaths.push("billing.orderedBy");
  }

  return {
    application: {
      fieldUpdates,
      attorneyAdds,
      attorneyPatches: mergeAttorneyPatches(plainAttorneyPatches),
      witnessAdds: [],
      witnessPatches,
      conflicts,
      keyterms: parsed.deepgramKeyterms.map((term): DeepgramKeyterm => ({
        term,
        boost: 0.5,
        category: "proper_name",
        notes: "Extracted from Job Sheet",
      })),
    },
    droppedPaths,
  };
}
