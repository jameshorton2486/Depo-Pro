import type { EditorDocument } from "../../api/types";
import type { AbbreviationRegistry, FormattedDocument, GeometryProfile } from "./types";

export function cfe(
  doc: EditorDocument,
  _geometry: GeometryProfile,
  _registry: AbbreviationRegistry
): FormattedDocument {
  return {
    job_id: doc.job_id,
    lines: [],
  };
}
