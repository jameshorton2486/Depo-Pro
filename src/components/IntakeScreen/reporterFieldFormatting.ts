export function digitsOnly(value: string, maxLength?: number): string {
  const digits = value.replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}

export function formatPhoneDisplay(value: string): string {
  const digits = digitsOnly(value, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatReporterDateDisplay(value: string): string {
  if (!value.trim()) {
    return "";
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  }

  const digits = digitsOnly(value, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseReporterDateToIso(value: string): string | null {
  const digits = digitsOnly(value, 8);
  if (digits.length !== 8) {
    return null;
  }

  const month = Number(digits.slice(0, 2));
  const day = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4));

  if (month < 1 || month > 12 || day < 1) {
    return null;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() !== month - 1
    || candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getReporterFormattingWarnings(values: {
  phone: string;
  csrExpiration: string;
}): string[] {
  const warnings: string[] = [];
  const phoneDigits = digitsOnly(values.phone, 10);
  if (phoneDigits && phoneDigits.length !== 10) {
    warnings.push("Reporter phone should contain 10 digits.");
  }

  const expirationDigits = digitsOnly(values.csrExpiration, 8);
  if (expirationDigits.length > 0 && parseReporterDateToIso(values.csrExpiration) === null) {
    warnings.push("CSR expiration should be a valid date in MM/DD/YYYY format.");
  }

  return warnings;
}
