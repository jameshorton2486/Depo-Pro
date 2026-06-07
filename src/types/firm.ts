export interface Firm {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  main_phone: string;
  fax: string;
  created_at: string;
  updated_at: string;
}

export type FirmInsert = Omit<Firm, "id" | "created_at" | "updated_at">;
export type FirmUpdate = Partial<Omit<Firm, "id" | "created_at" | "updated_at">>;

type RawFirmRow = Omit<Firm, never>;

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeFirmRow(row: RawFirmRow): Firm {
  return {
    id: row.id,
    name: normalizeString(row.name),
    address: normalizeString(row.address),
    city: normalizeString(row.city),
    state: normalizeString(row.state),
    zip: normalizeString(row.zip),
    main_phone: normalizeString(row.main_phone),
    fax: normalizeString(row.fax),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeFirmInsert(payload: FirmInsert): FirmInsert {
  return {
    name: normalizeString(payload.name),
    address: normalizeString(payload.address),
    city: normalizeString(payload.city),
    state: normalizeString(payload.state),
    zip: normalizeString(payload.zip),
    main_phone: normalizeString(payload.main_phone),
    fax: normalizeString(payload.fax),
  };
}

export function normalizeFirmUpdate(payload: FirmUpdate): FirmUpdate {
  const normalized: FirmUpdate = {};

  if ("name" in payload) normalized.name = normalizeString(payload.name);
  if ("address" in payload) normalized.address = normalizeString(payload.address);
  if ("city" in payload) normalized.city = normalizeString(payload.city);
  if ("state" in payload) normalized.state = normalizeString(payload.state);
  if ("zip" in payload) normalized.zip = normalizeString(payload.zip);
  if ("main_phone" in payload) normalized.main_phone = normalizeString(payload.main_phone);
  if ("fax" in payload) normalized.fax = normalizeString(payload.fax);

  return normalized;
}
