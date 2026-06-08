import { normalizeCaseRecord as normalizeCaseRecordImpl, type CaseRecord } from "../types/case.ts";

export function normalizeCaseRecord(record: unknown): CaseRecord {
  return normalizeCaseRecordImpl(record);
}
