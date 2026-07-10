import type { CaseCertification } from "../types/case";

export function isCertificationReady(certification: CaseCertification | null | undefined): boolean {
  return Boolean(
    certification
    && certification.certification_statement.trim().length > 0
    && Object.values(certification.checklist).every(Boolean),
  );
}

export function isCertificationLocked(certification: CaseCertification | null | undefined): boolean {
  return Boolean(certification?.certification_date);
}
