import type { EditorDocument } from "../api/types";
import type { CaseRecord } from "../types/case";
import { abbreviationRegistry } from "./format/abbreviationRegistry";
import { cfe } from "./format/cfe";
import { DEFAULT_GEOMETRY_PROFILE } from "./format/geometryProfile";
import { serializeFormattedDocumentClean } from "./format/serialize";
import { buildInclusionPagesText } from "./transcript/inclusionPages";
import { buildWorkspaceTranscriptTextClean } from "./transcript/workspacePresentation";

export function buildFormattedTranscriptText(
  document: EditorDocument,
  options?: {
    structureConfirmed?: boolean;
    keepRawLabels?: boolean;
    record?: CaseRecord | null;
    inclusionPages?: Record<string, unknown> | null;
  },
): string {
  const body = options?.structureConfirmed && !options?.keepRawLabels
    ? buildWorkspaceTranscriptTextClean(document, options.record)
    : serializeFormattedDocumentClean(cfe(document, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry));
  const frontMatter = buildInclusionPagesText(options?.inclusionPages);

  return frontMatter ? `${frontMatter}\n\n${body}`.trim() : body;
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

export function buildPrintableTranscriptHtml(title: string, transcriptText: string): string {
  return [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8" />',
    `<title>${escapeHtml(title)}</title>`,
    "<style>",
    "@page { margin: 0.75in; size: letter; }",
    "body { font-family: 'Courier New', Courier, monospace; margin: 0; color: #111827; background: #ffffff; }",
    "main { white-space: pre-wrap; font-size: 12pt; line-height: 1.45; }",
    "</style>",
    "</head>",
    "<body>",
    `<main>${escapeHtml(transcriptText)}</main>`,
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

export function downloadWordTranscript(filename: string, title: string, transcriptText: string) {
  return downloadBlob(
    filename,
    "application/msword",
    buildWordTranscriptHtml(title, transcriptText),
  );
}

export function openPrintPreview(title: string, transcriptText: string) {
  const printableHtml = buildPrintableTranscriptHtml(title, transcriptText);
  const preview = window.open("", "_blank", "noopener,noreferrer");
  if (!preview) {
    throw new Error("Print preview was blocked by the browser.");
  }

  preview.document.open();
  preview.document.write(printableHtml);
  preview.document.close();
  preview.focus();
  preview.print();

  return {
    name: `${title}.pdf`,
    type: "application/pdf (browser print)",
    size: printableHtml.length,
  };
}
