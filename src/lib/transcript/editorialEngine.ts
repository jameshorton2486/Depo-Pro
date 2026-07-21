import abbreviationRegistry from "../../../Canonical Standards Folder/abbreviation_registry.json";

import type { UnifiedRenderLine, UnifiedRenderModel } from "./unifiedRendering";

export interface EditorialMetrics {
  punctuationCorrections: number;
  capitalizationCorrections: number;
  objectionFormattingCorrections: number;
  numberFormattingCorrections: number;
}

export interface EditorialResult {
  text: string;
  punctuationCorrections: number;
  capitalizationCorrections: number;
  objectionFormattingCorrections: number;
  numberFormattingApplied: number;
}

export interface EditorialRenderResult {
  model: UnifiedRenderModel;
  metrics: EditorialMetrics;
}

const abbreviationTokens = new Set(
  Object.values(abbreviationRegistry.one_space_tokens).flat().map((token) => token.toLocaleLowerCase()),
);
const objectionBases = [
  "form", "hearsay", "speculation", "foundation", "leading", "nonresponsive", "compound",
  "relevance", "privilege", "scope", "argumentative", "vague",
] as const;
const objectionPattern = new RegExp(`\\bObjection(?:[,:;.]?)\\s+(${objectionBases.join("|")})(?:[.?!]?)\\b`, "gi");
const roleLabelPattern = /^(the\s+(?:witness|reporter|videographer))\s*:/i;

export function applyEditorialRules(text: string): EditorialResult {
  const punctuation = applyPunctuationRules(text);
  const objections = applyObjectionRules(punctuation.text);
  const capitalization = applyCapitalizationRules(objections.text);
  const numeric = applyNumberFormatting(capitalization.text);
  return {
    text: numeric.text,
    punctuationCorrections: punctuation.changes,
    capitalizationCorrections: capitalization.changes,
    objectionFormattingCorrections: objections.changes,
    numberFormattingApplied: numeric.changes,
  };
}

export function applyEditorialRulesToRenderModel(model: UnifiedRenderModel): EditorialRenderResult {
  const metrics: EditorialMetrics = { punctuationCorrections: 0, capitalizationCorrections: 0, objectionFormattingCorrections: 0, numberFormattingCorrections: 0 };
  const lines = model.lines.map((line): UnifiedRenderLine => {
    const result = applyEditorialRules(line.content);
    metrics.punctuationCorrections += result.punctuationCorrections;
    metrics.capitalizationCorrections += result.capitalizationCorrections;
    metrics.objectionFormattingCorrections += result.objectionFormattingCorrections;
    metrics.numberFormattingCorrections += result.numberFormattingApplied;
    return { ...line, content: result.text, sourceUtteranceIds: [...line.sourceUtteranceIds], sourceWordIds: [...line.sourceWordIds], geometry: { ...line.geometry } };
  });
  return { model: { ...model, geometry: { ...model.geometry }, lines }, metrics };
}

function applyPunctuationRules(text: string): { text: string; changes: number } {
  let changes = 0;
  let next = text.replace(/,\s*(["'])\s*(?=--|—)/g, (_match, quote: string) => {
    changes += 1;
    return `${quote} `;
  });
  next = replaceAndCount(next, /\s*,\s*(?=--|—)/g, " ", () => { changes += 1; });
  next = replaceAndCount(next, /\s*(?:--|—)\s*/g, " -- ", () => { changes += 1; });
  next = next.replace(/\bOkay,\s+/g, (match) => {
    const replacement = "Okay. ";
    if (match !== replacement) changes += 1;
    return replacement;
  });
  next = next.replace(/([.?!]["'])\s+(?=[A-Z])/g, (match, boundary: string) => {
    const replacement = `${boundary}  `;
    if (match !== replacement) changes += 1;
    return replacement;
  });
  next = next.replace(/([?!])\s+(?=[A-Z])/g, (match, boundary: string) => {
    const replacement = `${boundary}  `;
    if (match !== replacement) changes += 1;
    return replacement;
  });
  next = next.replace(/(\S+)\.\s+(?=[A-Z])/g, (match, token: string) => {
    const usesOneSpace = token.toLocaleLowerCase() === "okay" || isAbbreviation(token);
    const replacement = `${token}.${usesOneSpace ? " " : "  "}`;
    if (match !== replacement) changes += 1;
    return replacement;
  });
  return { text: next.trim(), changes };
}

function applyObjectionRules(text: string): { text: string; changes: number } {
  let changes = 0;
  const normalized = text.replace(objectionPattern, (match, basis: string) => {
    const replacement = `Objection.  ${capitalize(basis)}.`;
    if (match !== replacement) changes += 1;
    return replacement;
  });
  return { text: normalized, changes };
}

function applyCapitalizationRules(text: string): { text: string; changes: number } {
  let changes = 0;
  const normalized = text.replace(roleLabelPattern, (match, label: string) => {
    const replacement = `${label.toLocaleUpperCase()}:`;
    if (match !== replacement) changes += 1;
    return replacement;
  });
  return { text: normalized, changes };
}

function applyNumberFormatting(text: string): { text: string; changes: number } {
  let changes = 0;
  const currencyAdjusted = text.replace(/\$\d+\.00\b/g, (token) => { changes += 1; return token.slice(0, -3); });
  const percentAdjusted = currencyAdjusted.replace(/\b\d+%/g, (token) => { changes += 1; return `${token.slice(0, -1)} percent`; });
  const timeAdjusted = percentAdjusted.replace(/\b0(\d:\d{2}\s*[ap]\.m\.)/gi, (_match, time: string) => { changes += 1; return time; });
  return { text: timeAdjusted, changes };
}

function isAbbreviation(token: string): boolean {
  const normalized = `${token}.`.toLocaleLowerCase();
  if (normalized === "no.") return false;
  return abbreviationTokens.has(normalized) || /^[A-Z]$/.test(token) || /[A-Za-z]\.[A-Za-z]$/.test(token);
}

function replaceAndCount(text: string, pattern: RegExp, replacement: string, onChange: () => void): string {
  return text.replace(pattern, (match) => { if (match !== replacement) onChange(); return replacement; });
}

function capitalize(value: string): string {
  return `${value.charAt(0).toLocaleUpperCase()}${value.slice(1).toLocaleLowerCase()}`;
}
