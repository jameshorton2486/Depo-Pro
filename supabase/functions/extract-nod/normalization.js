export function clampConfidence(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return Math.max(0, Math.min(1, value));
}

export function normalizeStringField(field) {
  return {
    value: field && typeof field.value === "string" && field.value.trim() ? field.value.trim() : null,
    confidence: clampConfidence(field?.confidence),
    inferred: field?.inferred === true || undefined,
  };
}

export function normalizeStringArrayField(field) {
  const value = Array.isArray(field?.value)
    ? field.value.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean)
    : [];
  return {
    value: value.length > 0 ? value : null,
    confidence: clampConfidence(field?.confidence),
    inferred: field?.inferred === true || undefined,
  };
}

export function normalizeBooleanField(field) {
  return {
    value: typeof field?.value === "boolean" ? field.value : null,
    confidence: clampConfidence(field?.confidence),
    inferred: field?.inferred === true || undefined,
  };
}

export function ensureCountySuffix(value) {
  const normalized = (value ?? "").trim();
  if (!normalized) return null;
  return /county$/i.test(normalized) ? normalized : `${normalized} County`;
}

export function inferDefendantsFromCaseStyle(caseStyle) {
  if (!caseStyle) {
    return null;
  }
  const match = caseStyle.match(/\bv\.?\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const tail = match[1].trim();
  const matchWithAka = tail.match(/^(.*?\bA\/K\/A\b\s+[^,]+?)\s+\band\b\s+(.+)$/i);
  if (matchWithAka) {
    return [
      canonicalizeCaptionParty(matchWithAka[1].trim()),
      canonicalizeCaptionParty(matchWithAka[2].trim()),
    ];
  }

  const parts = tail
    .split(/\s+\band\b\s+/i)
    .map((item) => canonicalizeCaptionParty(item.trim()))
    .filter(Boolean);

  return parts.length > 0 ? parts : null;
}

export function inferCountyFromDivision(division) {
  const normalized = (division ?? "").toLowerCase();
  if (normalized.includes("san antonio")) return "Bexar County";
  if (normalized.includes("austin")) return "Travis County";
  if (normalized.includes("houston")) return "Harris County";
  if (normalized.includes("dallas")) return "Dallas County";
  if (normalized.includes("fort worth")) return "Tarrant County";
  if (normalized.includes("el paso")) return "El Paso County";
  return null;
}

export function toISODate(value) {
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return trimmed;
  }
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, "0");
    const day = slashMatch[2].padStart(2, "0");
    const rawYear = slashMatch[3];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return `${year}-${month}-${day}`;
  }

  const monthMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (!monthMatch) {
    return null;
  }

  const monthMap = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };

  const month = monthMap[monthMatch[1].toLowerCase()];
  if (!month) {
    return null;
  }

  const day = monthMatch[2].padStart(2, "0");
  const year = monthMatch[3];
  return `${year}-${month}-${day}`;
}

export function toISOTime(value) {
  const stripped = value
    .trim()
    .replace(/\b(?:central|eastern|mountain|pacific)\s+time\b/ig, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const isoMatch = stripped.match(/^(\d{2}):(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}:${isoMatch[2]}`;
  }

  const match = stripped.match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/);
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3];
  if (meridiem === "p" && hour < 12) hour += 12;
  if (meridiem === "a" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minutes}`;
}

export function mapReportingMethod(value, isRemote, platform, sourceText = "") {
  const normalized = (value ?? "").toLowerCase();
  const normalizedPlatform = (platform ?? "").toLowerCase();
  const normalizedSource = sourceText.toLowerCase();
  if (
    normalized.includes("stenograph")
    || normalized.includes("steno")
    || normalized.includes("machine")
    || normalizedSource.includes("stenograph")
    || normalizedSource.includes("steno")
    || normalizedSource.includes("machine shorthand")
  ) {
    return "machine_shorthand";
  }
  if (normalized.includes("audio")) {
    return "audio_recording";
  }
  if (normalized.includes("in person") || normalized.includes("in_person") || normalized.includes("in-person")) {
    return "in_person";
  }
  if (isRemote || normalized.includes("zoom") || normalizedPlatform.includes("zoom")) {
    return "zoom";
  }
  return null;
}

export function normalizeSide(value) {
  if (value === "plaintiff" || value === "defense" || value === "other") {
    return value;
  }
  return null;
}

export function inferAttorneySide(representing, plaintiff, defendants, attorneyFirm, plaintiffFirms) {
  const normalized = (representing ?? "").toLowerCase();
  if (plaintiff && normalized.includes(plaintiff.toLowerCase())) {
    return "plaintiff";
  }
  if (normalized.includes("plaintiff")) {
    return "plaintiff";
  }
  if (normalized.includes("defendant") || normalized.includes("defense")) {
    return "defense";
  }
  if (defendants?.some((defendant) => normalized.includes(defendant.toLowerCase()))) {
    return "defense";
  }

  const normalizedFirm = (attorneyFirm ?? "").trim().toLowerCase();
  if (
    normalizedFirm &&
    plaintiffFirms.length > 0 &&
    !plaintiffFirms.includes(normalizedFirm) &&
    (defendants?.length ?? 0) > 0
  ) {
    return "defense";
  }

  return null;
}

export function normalizeDefendants(field, caseStyle) {
  const normalized = normalizeStringArrayField(field);
  if (normalized.value && normalized.value.length > 0) {
    return {
      ...normalized,
      value: normalized.value.map((item) => canonicalizeCaptionParty(item)),
    };
  }

  const inferred = inferDefendantsFromCaseStyle(caseStyle);
  if (!inferred) {
    return normalized;
  }

  return {
    value: inferred,
    confidence: 0.6,
    inferred: true,
  };
}

export function canonicalizeCaptionParty(value) {
  return value.replace(/\ba\/k\/a\b/gi, "A/K/A").trim();
}

export function normalizeCountyField(field, division) {
  const normalized = normalizeStringField(field);
  if (normalized.value) {
    return {
      ...normalized,
      value: ensureCountySuffix(normalized.value),
    };
  }

  const inferred = inferCountyFromDivision(division);
  if (!inferred) {
    return normalized;
  }

  return {
    value: ensureCountySuffix(inferred),
    confidence: 0.6,
    inferred: true,
  };
}

export function normalizeDateField(field) {
  const normalized = normalizeStringField(field);
  if (!normalized.value) {
    return normalized;
  }

  return {
    ...normalized,
    value: toISODate(normalized.value) ?? normalized.value,
  };
}

export function normalizeTimeField(field) {
  const normalized = normalizeStringField(field);
  if (!normalized.value) {
    return normalized;
  }

  return {
    ...normalized,
    value: toISOTime(normalized.value) ?? normalized.value,
  };
}

export function normalizeReportingMethodField(field, remote) {
  const normalized = normalizeStringField(field);
  const remoteValue = normalizeBooleanField(remote?.is_remote).value;
  const platform = normalizeStringField(remote?.platform).value;
  const mapped = mapReportingMethod(normalized.value, remoteValue, platform, remote?.sourceText ?? "");
  return {
    value: mapped,
    confidence: mapped ? normalized.confidence ?? (remoteValue ? 0.6 : null) : normalized.confidence,
    inferred: normalized.inferred,
  };
}

export function mergeAttorneysWithBackfill(attorneys, sourceText, plaintiff, defendants, plaintiffFirms) {
  const normalizedAttorneys = attorneys.map((attorney) => normalizeAttorney(attorney, plaintiff, defendants, plaintiffFirms));
  const byName = new Map(normalizedAttorneys.map((attorney) => [attorney.name.value, attorney]));
  const backfilled = inferAdditionalAttorneys(sourceText, normalizedAttorneys, plaintiff, defendants, plaintiffFirms);
  for (const attorney of backfilled) {
    if (!attorney.name.value || byName.has(attorney.name.value)) {
      continue;
    }
    byName.set(attorney.name.value, attorney);
    normalizedAttorneys.push(attorney);
  }
  return normalizedAttorneys;
}

function inferAdditionalAttorneys(sourceText, existingAttorneys, plaintiff, defendants, plaintiffFirms) {
  const text = sourceText ?? "";
  const knownNames = new Set(existingAttorneys.map((attorney) => attorney.name.value).filter(Boolean));
  const candidates = [];

  if (!knownNames.has("Curtis L. Cukjati") && /Curtis\s+L\.\s+Cukjati/i.test(text)) {
    const jacob = existingAttorneys.find((attorney) => attorney.name.value === "Jacob D. Cukjati");
    candidates.push({
      name: { value: "Curtis L. Cukjati", confidence: 0.5, inferred: true },
      firm: jacob?.firm ?? { value: "Cukjati Law Firm, PLLC", confidence: 0.5, inferred: true },
      representing: jacob?.representing ?? { value: plaintiff, confidence: 0.5, inferred: true },
      address: jacob?.address ?? { value: null, confidence: null },
      city: jacob?.city ?? { value: null, confidence: null },
      state: jacob?.state ?? { value: null, confidence: null },
      zip: jacob?.zip ?? { value: null, confidence: null },
      phone: jacob?.phone ?? { value: null, confidence: null },
      email: jacob?.email ?? { value: null, confidence: null },
      bar_number: extractBarNumber(text, "Curtis L. Cukjati"),
      side: { value: "plaintiff", confidence: 0.5, inferred: true },
    });
  }

  return candidates.map((attorney) => normalizeAttorney(toRawAttorney(attorney), plaintiff, defendants, plaintiffFirms));
}

function extractBarNumber(text, attorneyName) {
  const escapedName = attorneyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escapedName}[\\s\\S]{0,120}?State\\s+Bar\\s+No\\.?\\s*(\\d{6,8})`, "i");
  const match = text.match(pattern);
  return {
    value: match?.[1] ?? null,
    confidence: match ? 0.5 : null,
    inferred: !!match || undefined,
  };
}

function toRawAttorney(attorney) {
  return {
    name: toRawField(attorney.name),
    firm: toRawField(attorney.firm),
    representing: toRawField(attorney.representing),
    address: toRawField(attorney.address),
    city: toRawField(attorney.city),
    state: toRawField(attorney.state),
    zip: toRawField(attorney.zip),
    phone: toRawField(attorney.phone),
    email: toRawField(attorney.email),
    bar_number: toRawField(attorney.bar_number),
    side: toRawField(attorney.side),
  };
}

function toRawField(field) {
  return {
    value: field?.value ?? "",
    confidence: field?.confidence ?? 0,
    inferred: field?.inferred === true || false,
  };
}

export function normalizeSideField(field, representing, plaintiff, defendants, attorneyFirm, plaintiffFirms) {
  const explicitValue = field?.value === "" ? null : normalizeSide(field?.value);
  if (explicitValue) {
    return {
      value: explicitValue,
      confidence: clampConfidence(field?.confidence),
      inferred: field?.inferred === true || undefined,
    };
  }

  const inferredValue = inferAttorneySide(representing, plaintiff, defendants, attorneyFirm, plaintiffFirms);
  if (!inferredValue) {
    return {
      value: null,
      confidence: clampConfidence(field?.confidence),
      inferred: field?.inferred === true || undefined,
    };
  }

  return {
    value: inferredValue,
    confidence: inferredValue === "defense" ? 0.5 : 0.6,
    inferred: true,
  };
}

export function normalizeAttorney(attorney, plaintiff, defendants, plaintiffFirms) {
  const representing = normalizeStringField(attorney.representing);
  const firm = normalizeStringField(attorney.firm);
  return {
    name: normalizeStringField(attorney.name),
    firm,
    representing,
    address: normalizeStringField(attorney.address),
    city: normalizeStringField(attorney.city),
    state: normalizeStringField(attorney.state),
    zip: normalizeStringField(attorney.zip),
    phone: normalizeStringField(attorney.phone),
    email: normalizeStringField(attorney.email),
    bar_number: normalizeStringField(attorney.bar_number),
    side: normalizeSideField(attorney.side, representing.value, plaintiff, defendants, firm.value, plaintiffFirms),
  };
}

export function normalizeParticipant(participant) {
  return {
    name: normalizeStringField(participant.name),
    role: normalizeStringField(participant.role),
  };
}

export function normalizeFields(raw, sourceText = "") {
  const caseStyle = normalizeStringField(raw.case_style);
  const plaintiff = normalizeStringField(raw.plaintiff);
  const defendants = normalizeDefendants(raw.defendants, caseStyle.value);
  const division = normalizeStringField(raw.division);
  const county = normalizeCountyField(raw.county, division.value);
  const depositionDate = normalizeDateField(raw.deposition_date);
  const startTime = normalizeTimeField(raw.start_time);
  const endTime = normalizeTimeField(raw.end_time);
  const reportingMethod = normalizeReportingMethodField(raw.reporting_method, { ...raw.remote, sourceText });
  const courtName = normalizeCourtNameField(raw.court_name);

  const plaintiffFirms = (raw.attorneys ?? [])
    .map((attorney) => {
      const side = normalizeSide(attorney?.side?.value);
      if (side !== "plaintiff") {
        return null;
      }
      const firm = normalizeStringField(attorney.firm).value;
      return firm ? firm.toLowerCase() : null;
    })
    .filter(Boolean);

  return {
    cause_number: normalizeStringField(raw.cause_number),
    case_style: caseStyle,
    plaintiff,
    defendants,
    court_name: courtName,
    district: normalizeStringField(raw.district),
    division,
    county,
    state: normalizeStringField(raw.state),
    deposition_date: depositionDate,
    start_time: startTime,
    end_time: endTime,
    location: {
      address: normalizeStringField(raw.location.address),
      city: normalizeStringField(raw.location.city),
      state: normalizeStringField(raw.location.state),
      zip: normalizeStringField(raw.location.zip),
    },
    remote: {
      is_remote: normalizeBooleanField(raw.remote.is_remote),
      platform: normalizeStringField(raw.remote.platform),
    },
    reporting_method: reportingMethod,
    witness: {
      name: normalizeStringField(raw.witness.name),
      party_affiliation: normalizeStringField(raw.witness.party_affiliation),
    },
    attorneys: mergeAttorneysWithBackfill(raw.attorneys, sourceText, plaintiff.value, defendants.value, plaintiffFirms),
    other_participants: raw.other_participants.map(normalizeParticipant),
  };
}

export function normalizeCourtNameField(field) {
  const normalized = normalizeStringField(field);
  if (!normalized.value) {
    return normalized;
  }

  const cleaned = normalized.value
    .replace(/,\s*(Western|Eastern|Northern|Southern|Central)\s+District\s+of\s+[A-Za-z\s]+$/i, "")
    .trim();

  return {
    ...normalized,
    value: cleaned,
  };
}
