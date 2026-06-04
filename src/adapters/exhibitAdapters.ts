import type { Exhibit } from "../api/types";
import type { CaseExhibit } from "../types/case";

export interface CaseExhibitToExhibitOptions {
  caseId?: string;
  casesRoot?: string;
  fallbackUrl?: string;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/[\\/]+$/, "");
}

export function caseExhibitToExhibit(
  exhibit: CaseExhibit,
  options: CaseExhibitToExhibitOptions = {}
): Exhibit {
  const casesRoot = trimTrailingSlash(options.casesRoot ?? "cases");
  const fallbackUrl = options.fallbackUrl ?? "#";

  let fileUrl = exhibit.file_url;
  if (!fileUrl && exhibit.filename && options.caseId) {
    fileUrl = `${casesRoot}/${options.caseId}/exhibits/files/${exhibit.filename}`;
  } else if (!fileUrl && exhibit.filename) {
    fileUrl = `${casesRoot}/exhibits/files/${exhibit.filename}`;
  }

  return {
    exhibit_id: exhibit.exhibit_id,
    label: exhibit.label,
    description: exhibit.description,
    file_url: fileUrl ?? fallbackUrl,
  };
}

export function caseExhibitsToExhibits(
  exhibits: readonly CaseExhibit[],
  options: CaseExhibitToExhibitOptions = {}
): Exhibit[] {
  return exhibits.map((exhibit) => caseExhibitToExhibit(exhibit, options));
}
