import type { CaseRecord } from "../../types/case";
import { deriveCaseReferenceTerms } from "../keytermDerivation";

const SINGLE_CAPITALIZED_WORD_PATTERN = /^[A-Z][a-z0-9'’-]*$/;

function normalizeTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ");
}

export function shouldSuggestLowercaseKeyterm(term: string, record: CaseRecord): boolean {
  const normalized = normalizeTerm(term);
  if (!SINGLE_CAPITALIZED_WORD_PATTERN.test(normalized)) {
    return false;
  }

  const references = deriveCaseReferenceTerms(record);
  return !references.has(normalized.toLowerCase());
}
