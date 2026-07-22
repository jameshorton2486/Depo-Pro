import type { CaseCertification } from "../types/case";

const REQUIRED_CHECKLIST_ITEMS = [
  "review_complete",
  "speaker_mapping_complete",
  "confidence_review_complete",
  "exhibits_complete",
  "ufm_complete",
] as const;

export function isCertificationReady(certification: CaseCertification | null | undefined): boolean {
  return Boolean(
    certification
    && certification.certification_statement.trim().length > 0
    && certification.checklist
    && REQUIRED_CHECKLIST_ITEMS.every((item) => certification.checklist[item] === true),
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
