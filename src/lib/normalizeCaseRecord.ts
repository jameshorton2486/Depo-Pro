import { normalizeCaseRecord as normalizeCaseRecordImpl, type CaseRecord } from "../types/case";

export function normalizeCaseRecord(record: unknown): CaseRecord {
  return normalizeCaseRecordImpl(record);
}
