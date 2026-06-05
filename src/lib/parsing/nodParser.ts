import type {
  ParsedNOD,
  CaseInfo,
  DepositionDetails,
  AttorneyAppearance,
} from "./parserTypes";
import { extractKeyterms } from "./keytermExtractor";

// This parser is kept as a documented fallback reference. The active intake
// extraction engine now lives in aiExtract.ts via the Supabase extract-nod function.

export function normalizePDFText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\u00AD/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, "\"")
    .trim();
}

function parseCaseInfo(text: string): CaseInfo {
  const result: CaseInfo = {
    causeNumber: "",
    caseStyle: "",
    plaintiff: "",
    defendant: "",
    courtType: "",
    court: "",
    district: "",
    division: "",
    county: "",
    state: "Texas",
  };

  const causeMatch = text.match(
    /(?:CIVIL\s+ACTION\s+NO\.?|CAUSE\s+NO\.?|CASE\s+NO\.?)\s*:?\s*([A-Z0-9\-:]+(?:-[A-Z]+)?)/i,
  );
  if (causeMatch) result.causeNumber = causeMatch[1].trim();

  if (/UNITED\s+STATES\s+DISTRICT\s+COURT/i.test(text)) {
    result.courtType = "federal";
    result.court = "UNITED STATES DISTRICT COURT";
  } else if (/DISTRICT\s+COURT/i.test(text)) {
    result.courtType = "state";
    result.court = "DISTRICT COURT";
  } else if (/COUNTY\s+COURT/i.test(text)) {
    result.courtType = "county";
    result.court = "COUNTY COURT";
  }

  const districtMatch = text.match(
    /(?:WESTERN|EASTERN|NORTHERN|SOUTHERN|CENTRAL)\s+DISTRICT\s+OF\s+(?:TEXAS|[A-Z]+)/i,
  );
  if (districtMatch) result.district = districtMatch[0].trim();

  const divisionMatch = text.match(/([A-Z\s]+)\s+DIVISION/i);
  if (divisionMatch) result.division = `${divisionMatch[1].trim()} DIVISION`;

  const plaintiffMatch = text.match(
    /^([A-Z][A-Z\s,\.]+?)\s*\n+\s*(?:Plaintiff|PLAINTIFF)/m,
  );
  if (plaintiffMatch) {
    result.plaintiff = plaintiffMatch[1].replace(/,\s*$/, "").trim();
  }

  const defendantMatch = text.match(
    /vs?\.\s+(?:CIVIL[^\n]*\n+)?([A-Z][A-Z\s,\.\/\-&]+?)\s*\n+\s*(?:Defendant|DEFENDANT)/im,
  );
  if (defendantMatch) {
    result.defendant = defendantMatch[1]
      .replace(/,\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const stateMatch = text.match(/STATE\s+OF\s+([A-Z]+)/i);
  if (stateMatch) {
    result.state = capitalize(stateMatch[1]);
  } else if (/TEXAS/i.test(text)) {
    result.state = "Texas";
  }

  const countyMatch =
    text.match(/\bCOUNTY\s+OF\s+([A-Z]+(?:\s+[A-Z]+)?)\b/i) ??
    text.match(/\bOF\s+([A-Z]+(?:\s+[A-Z]+)?)\s+COUNTY\b/i) ??
    text.match(/\b([A-Z]+(?:\s+[A-Z]+)?)\s+COUNTY\b/i);
  if (countyMatch) result.county = titleCase(countyMatch[1]);

  if (result.plaintiff && result.defendant) {
    result.caseStyle = `${result.plaintiff} v. ${result.defendant}`;
  }

  return result;
}

function parseDepositionDetails(text: string, caseInfo: CaseInfo): DepositionDetails {
  const result: DepositionDetails = {
    deponent: { name: "", role: "Witness" },
    date: "",
    time: "",
    location: "",
    method: "",
    isZoom: false,
    noticeTitle: "",
  };

  const titleMatch = text.match(
    /NOTICE\s+OF\s+(?:INTENTION\s+TO\s+TAKE\s+)?(?:ORAL\s+\/?\s+)?(?:ZOOM\s+)?DEPOSITION\s+OF\s+([A-Z][A-Z\s]+)/i,
  );
  if (titleMatch) {
    result.noticeTitle = titleMatch[0].trim();
    result.deponent.name = titleMatch[1].trim();
  }

  const deponentMatch = text.match(/Deponent\s*:\s+([^\n]+)/i);
  if (deponentMatch) result.deponent.name = deponentMatch[1].trim();

  const dateMatch = text.match(
    /Date\s*:\s+(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i,
  );
  if (dateMatch) result.date = dateMatch[1].replace(",", "").trim();

  const timeMatch = text.match(/Time\s*:\s+(\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)?(?:\s*\(Central Time\))?)/i);
  if (timeMatch) {
    result.time = timeMatch[1]
      .replace(/\(Central Time\)/i, "")
      .replace(/\./g, "")
      .trim();
  }

  const locationMatch = text.match(/Location\s*:\s+([^\n]+)/i);
  if (locationMatch) {
    const location = locationMatch[1].trim();
    result.location = location;
    if (/zoom/i.test(location)) {
      result.isZoom = true;
      result.method = "zoom";
    } else {
      result.method = "in-person";
    }
  }

  if (!result.isZoom && /via\s+zoom|zoom\s+deposition|remotely|video\s+teleconfer/i.test(text)) {
    result.isZoom = true;
    result.method = "zoom";
  }

  if (!result.deponent.name && caseInfo.plaintiff) {
    result.deponent.name = caseInfo.plaintiff;
  }

  return result;
}

function parseAppearances(text: string, caseInfo: CaseInfo): AttorneyAppearance[] {
  const appearances: AttorneyAppearance[] = [];
  const seen = new Set<string>();
  const blocks = text.split(/\n{2,}/);

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    const combined = lines.join(" ");
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(combined);
    const hasPhone = /\(?\d{3}\)?[\s\-\.]\d{3}[\s\-\.]\d{4}/.test(combined);
    const hasBarNo = /State\s+Bar\s+No\./i.test(combined);

    if (!hasEmail && !hasPhone && !hasBarNo) continue;

    const appearance = extractAttorneyBlock(lines, caseInfo);
    if (appearance && !seen.has(`${appearance.email.toLowerCase()}${appearance.attorneyName.toLowerCase()}`)) {
      seen.add(`${appearance.email.toLowerCase()}${appearance.attorneyName.toLowerCase()}`);
      appearances.push(appearance);
    }
  }

  const toMatch = text.match(
    /TO:\s+(?:Defendant|Plaintiff)[^,]*,\s+(?:by and through its attorney of record,\s+)?([A-Z][a-z]+(?:\s+[A-Z]\.?\s+[A-Z][a-z]+)?),\s+([A-Z][A-Z\s,&]+?(?:P\.C\.|PLLC|L\.L\.P|LLP|LLC))[,\.]?\s+([^\n]+)/i,
  );
  if (toMatch) {
    const name = toMatch[1].trim();
    const firm = toMatch[2].trim();
    const address = toMatch[3].trim();
    if (!seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      appearances.push({
        side: "Defendant",
        attorneyName: name,
        firmName: firm,
        address,
        phone: "",
        email: "",
        represents: caseInfo.defendant || "Defendant",
      });
    }
  }

  return appearances;
}

function extractAttorneyBlock(lines: string[], caseInfo: CaseInfo): AttorneyAppearance | null {
  const combined = lines.join(" ");
  const result: AttorneyAppearance = {
    side: "Plaintiff",
    attorneyName: "",
    firmName: "",
    address: "",
    phone: "",
    email: "",
    represents: "",
  };

  if (/ATTORNEYS?\s+FOR\s+DEFENDANT/i.test(combined)) {
    result.side = "Defendant";
    result.represents = caseInfo.defendant || "Defendant";
  } else if (/ATTORNEYS?\s+FOR\s+PLAINTIFF/i.test(combined)) {
    result.side = "Plaintiff";
    result.represents = caseInfo.plaintiff || "Plaintiff";
  }

  const firmPattern = /^([A-Z][A-Z\s,&\-\.\/]+(?:PLLC|P\.C\.|LLC|LLP|L\.L\.P\.|INC\.|CORP\.))\s*$/m;
  const firmMatch = lines.find((line) => firmPattern.test(line));
  if (firmMatch) result.firmName = firmMatch.trim();

  const signatureMatch = combined.match(/\/s\/\s+([A-Z][a-z]+(?:\s+[A-Z]\.?\s+[A-Z][a-z]+)+)/);
  if (signatureMatch) {
    result.attorneyName = signatureMatch[1].trim();
  } else {
    const barLineIndex = lines.findIndex((line) => /State\s+Bar\s+No\.?/i.test(line));
    if (barLineIndex > 0) {
      const candidate = lines[barLineIndex - 1];
      if (/^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+$/.test(candidate)) {
        result.attorneyName = candidate.trim();
      }
    }
  }

  if (!result.attorneyName) {
    const capsNameMatch = combined.match(/\b([A-Z]{2,}(?:\s+[A-Z]\.?\s+[A-Z]{2,})+)\b/);
    if (capsNameMatch) {
      result.attorneyName = titleCase(capsNameMatch[1]);
    }
  }

  const barMatch = combined.match(/State\s+Bar\s+No\.?\s*([0-9]+)/i);
  if (barMatch) result.stateBarNo = barMatch[1];

  const phoneMatch = combined.match(/(?:Tel|Phone|Ph)[\s.:]*(\(?\d{3}\)?[\s\-\.]\d{3}[\s\-\.]\d{4})/i);
  if (phoneMatch) result.phone = phoneMatch[1].trim();

  const emailMatch = combined.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) result.email = emailMatch[1].trim();

  const addressLines: string[] = [];
  for (const line of lines) {
    if (/^\d+\s+[A-Z]/.test(line) || /(?:Suite|Ste\.?|Ave|Street|Blvd|Drive|Rd|Road|Place|Plaza)\b/i.test(line)) {
      addressLines.push(line);
    } else if (addressLines.length > 0 && /^[A-Z][a-z]+,?\s+[A-Z]{2}\s+\d{5}/.test(line)) {
      addressLines.push(line);
    }
  }
  result.address = addressLines.join(", ");

  if (!result.attorneyName && !result.firmName) return null;
  return result;
}

export function parseNODText(rawText: string): ParsedNOD {
  const text = normalizePDFText(rawText);
  const caseInfo = parseCaseInfo(text);
  const depositionDetails = parseDepositionDetails(text, caseInfo);
  const appearances = parseAppearances(text, caseInfo);
  const { deepgramKeyterms, confirmedSpellings, phoneticMappings } = extractKeyterms({
    caseInfo,
    depositionDetails,
    appearances,
  });

  return {
    caseInfo,
    depositionDetails,
    appearances,
    reporterInfo: {},
    deepgramKeyterms,
    confirmedSpellings,
    phoneticMappings,
    rawText: text,
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
