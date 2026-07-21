export interface EditorialResult {
  text: string;
  punctuationCorrections: number;
  numberFormattingApplied: number;
}
const ABBREVIATION_PATTERN = /\b(?:Mr|Ms|Mrs|Dr|No|CSR|a\.m|p\.m|St|Ave|Blvd|Rd|Inc|LLC|PLLC|Corp)\.$/i;

function applyPunctuationRules(text: string): { text: string; changes: number } {
  let next = text;
  let changes = 0;
  const byLinePrefixMatch = next.match(/^\(BY\s+(MR|MS|MRS)\.\s{2}[A-Z][A-Z\s]+\)\s{2}/);
  const byLinePrefix = byLinePrefixMatch?.[0] ?? "";
  const bodyWithoutByLine = byLinePrefix ? next.slice(byLinePrefix.length) : next;

  const objectionSpaced = bodyWithoutByLine.replace(/(Objection\.)\s+(Form|Hearsay|Speculation|Foundation|Leading|Nonresponsive|Compound|Relevance|Privilege|Scope|Argumentative|Vague)\./g, "$1  $2.");
  if (objectionSpaced !== bodyWithoutByLine) {
    changes += 1;
  }
  let body = objectionSpaced;

  const okayNormalized = body.replace(/\bOkay,\s+/g, "Okay. ");
  if (okayNormalized !== body) {
    changes += 1;
  }
  body = okayNormalized;

  body = body.replace(/([.?!])\s([A-Z])/g, (_match, terminal: string, capital: string, offset: number, source: string) => {
    const prefix = source.slice(0, offset + 1);
    const lastToken = prefix.split(/\s+/).filter(Boolean).pop() ?? "";
    if (/Okay\.$/i.test(lastToken)) {
      return `${terminal} ${capital}`;
    }
    if (ABBREVIATION_PATTERN.test(lastToken)) {
      return `${terminal} ${capital}`;
    }
    changes += 1;
    return `${terminal}  ${capital}`;
  });

  body = body.replace(/\s*--\s*/g, " -- ");
  body = body.replace(/ {3,}/g, "  ");
  next = `${byLinePrefix}${body}`.trim();

  return { text: next.trim(), changes };
}

function formatCurrencyToken(token: string): string {
  const match = token.match(/^\$(\d+)\.00$/);
  if (!match) {
    return token;
  }
  return `$${match[1]}`;
}

function formatPercentageToken(token: string): string {
  const match = token.match(/^(\d+)%$/);
  if (!match) {
    return token;
  }
  return `${match[1]} percent`;
}

function applyNumberFormatting(text: string): { text: string; changes: number } {
  let changes = 0;
  const currencyAdjusted = text.replace(/\$\d+\.00\b/g, (token) => {
    const updated = formatCurrencyToken(token);
    if (updated !== token) {
      changes += 1;
    }
    return updated;
  });

  const percentAdjusted = currencyAdjusted.replace(/\b\d+%/g, (token) => {
    const updated = formatPercentageToken(token);
    if (updated !== token) {
      changes += 1;
    }
    return updated;
  });

  const timeAdjusted = percentAdjusted.replace(/\b0(\d:\d{2}\s*[ap]\.m\.)/gi, (_match, time: string) => {
    changes += 1;
    return time;
  });

  return { text: timeAdjusted, changes };
}


export function applyEditorialRules(text: string): EditorialResult {
  const punctuation = applyPunctuationRules(text);
  const numeric = applyNumberFormatting(punctuation.text);
  return {
    text: numeric.text,
    punctuationCorrections: punctuation.changes,
    numberFormattingApplied: numeric.changes,
  };
}
