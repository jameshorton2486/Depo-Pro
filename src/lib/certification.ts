import type { CaseCertification } from "../types/case";

export function isCertificationReady(certification: CaseCertification | null | undefined): boolean {
  return Boolean(
    certification
    && certification.certification_statement.trim().length > 0
    && certification.checklist
    && Object.values(certification.checklist).every(Boolean),
  );
}

export function isCertificationLocked(certification: CaseCertification | null | undefined): boolean {
  return Boolean(certification?.certification_date);
}

export function formatLocalCertificationDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
