import type { EditorDocument } from "../api/types";
import type { CaseRecord } from "../types/case";
import { abbreviationRegistry } from "./format/abbreviationRegistry";
import { cfe } from "./format/cfe";
import { DEFAULT_GEOMETRY_PROFILE } from "./format/geometryProfile";
import { serializeFormattedDocumentClean } from "./format/serialize";
import { buildWorkspaceTranscriptTextClean } from "./transcript/workspacePresentation";

export function buildFormattedTranscriptText(
  document: EditorDocument,
  options?: {
    structureConfirmed?: boolean;
    keepRawLabels?: boolean;
    record?: CaseRecord | null;
  },
): string {
  if (options?.structureConfirmed && !options?.keepRawLabels) {
    return buildWorkspaceTranscriptTextClean(document, options.record);
  }

  const formatted = cfe(document, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry);
  return serializeFormattedDocumentClean(formatted);
}

export function buildWorkspaceTranscriptJson(document: EditorDocument): string {
  return JSON.stringify(document, null, 2);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildWordTranscriptHtml(title: string, transcriptText: string): string {
  return [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8" />',
    `<title>${escapeHtml(title)}</title>`,
    "<style>",
    "body { font-family: 'Courier New', Courier, monospace; margin: 1in; color: #111827; }",
    "pre { white-space: pre-wrap; margin: 0; font-family: inherit; font-size: 12pt; line-height: 1.5; }",
    "</style>",
    "</head>",
    "<body>",
    `<pre>${escapeHtml(transcriptText)}</pre>`,
    "</body>",
    "</html>",
  ].join("");
}

export function downloadBlob(filename: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return { name: filename, type, size: blob.size };
}
