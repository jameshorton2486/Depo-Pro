const UPPERCASE_TERMS = new Set([
  "llc", "llp", "pllc", "lp", "pc", "ltd", "usa", "dba", "fka", "aka", "md", "phd",
]);

const LOWERCASE_TERMS = new Set([
  "a", "an", "and", "at", "by", "for", "in", "of", "on", "or", "the", "to", "v", "vs",
]);

export function titleCaseLegalText(value: string): string {
  let isFirstWord = true;
  const titled = value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US")
    .replace(/[a-z]+(?:['-][a-z]+)*/g, (word) => {
      const normalized = word.replace(/['-]/g, "");
      if (UPPERCASE_TERMS.has(normalized)) {
        isFirstWord = false;
        return word.toUpperCase();
      }
      if (!isFirstWord && LOWERCASE_TERMS.has(word)) return word === "vs" ? "v" : word;
      isFirstWord = false;
      const titledWord = word.replace(/(^|['-])[a-z]/g, (match) => match.toUpperCase());
      return titledWord.replace(/^Mc([a-z])/, (_, letter: string) => `Mc${letter.toUpperCase()}`);
    });

  return titled
    .replace(/\b(\d+)(St|Nd|Rd|Th)\b/g, (_, ordinal: string, suffix: string) => `${ordinal}${suffix.toLowerCase()}`)
    .replace(/\b(?:[a-z]\.){2,}[a-z]?\.?/gi, (acronym) => acronym.toUpperCase())
    .replace(/\b([a-z])\.(?=\s+[A-Z])/g, (_, initial: string) => initial === "v" ? "v." : `${initial.toUpperCase()}.`)
    .replace(/\b[a-z]\/[a-z]\/[a-z]\b/gi, (acronym) => acronym.toUpperCase());
}

export function formatUsPhoneNumber(value: string): string {
  const normalized = value.trim();
  const digits = normalized.replace(/\D/g, "");
  const localDigits = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (localDigits.length !== 10) {
    return normalized;
  }

  return `(${localDigits.slice(0, 3)}) ${localDigits.slice(3, 6)}-${localDigits.slice(6)}`;
}
export function formatDeepgramKeyterm(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return /^\d{1,4}-[a-z]{1,8}-[a-z0-9-]+$/i.test(trimmed)
    ? trimmed.toUpperCase()
    : titleCaseLegalText(trimmed);

}