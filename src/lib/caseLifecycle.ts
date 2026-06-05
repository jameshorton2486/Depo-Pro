import type { WorkflowStage } from "../types/case";

export const LAST_OPENED_CASE_ID_KEY = "depo-pro.last-opened-case-id";
export const DEMO_CASE_ID = "job_demo_001";

export interface CaseStatusPresentation {
  label: string;
  tone: "slate" | "blue" | "emerald";
}

export interface CaseListFilterTarget {
  case_id: string;
  caseName: string;
  caseStyle: string;
  witnessName: string;
}

export function caseStatusFromStage(
  stage: WorkflowStage,
  certified: boolean,
): CaseStatusPresentation {
  if (certified) {
    return { label: "Certified", tone: "emerald" };
  }

  switch (stage) {
    case "intake":
      return { label: "Intake", tone: "slate" };
    case "creation":
      return { label: "Transcript Creation", tone: "blue" };
    case "workspace":
      return { label: "Transcript Workspace", tone: "blue" };
    case "exhibits":
      return { label: "Exhibits", tone: "blue" };
    case "ufm":
      return { label: "UFM Insertions", tone: "blue" };
    case "certification":
      return { label: "Certification", tone: "blue" };
    case "export":
      return { label: "Export", tone: "blue" };
  }
}

export function shouldPersistLastOpenedCaseId(caseId: string): boolean {
  return caseId !== DEMO_CASE_ID;
}

export function normalizeCaseSearchText(value: string): string {
  return value.trim().toLowerCase();
}

export function matchesCaseSearch(
  item: CaseListFilterTarget,
  query: string,
): boolean {
  const normalizedQuery = normalizeCaseSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  return [
    item.case_id,
    item.caseName,
    item.caseStyle,
    item.witnessName,
  ]
    .join("\n")
    .toLowerCase()
    .includes(normalizedQuery);
}
