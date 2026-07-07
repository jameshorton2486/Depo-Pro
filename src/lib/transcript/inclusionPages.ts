type InclusionPagesPayload = Record<string, unknown> | null | undefined;

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function joinNonEmpty(values: Array<string | null | undefined>, separator: string): string | null {
  const filtered = values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return filtered.length > 0 ? filtered.join(separator) : null;
}

function formatAppearance(entry: Record<string, unknown>): string[] {
  const name = readString(entry.name) ?? "Unnamed appearance";
  const role = readString(entry.role) ?? readString(entry.category);
  const firm = readString(entry.firm);
  const representing = readString(entry.representing);
  const address = readString(entry.address);
  const cityStateZip = joinNonEmpty([
    readString(entry.city),
    readString(entry.state),
    readString(entry.zip),
  ], ", ");
  const phone = readString(entry.phone);
  const email = readString(entry.email);

  return [
    `${name}${role ? ` (${role})` : ""}`,
    ...[firm, representing ? `For: ${representing}` : null, address, cityStateZip, phone, email].filter((line): line is string => Boolean(line)),
  ];
}

function formatAppearances(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const lines: string[] = ["APPEARANCES"];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const block = formatAppearance(entry as Record<string, unknown>);
    if (block.length === 0) {
      continue;
    }
    if (lines.length > 1) {
      lines.push("");
    }
    lines.push(...block);
  }
  return lines.length > 1 ? lines : [];
}

function formatIndexes(label: string, rows: string[]): string[] {
  if (rows.length === 0) {
    return [];
  }
  return [label, ...rows];
}

export function buildInclusionPagesText(inclusionPages: InclusionPagesPayload): string {
  if (!inclusionPages || typeof inclusionPages !== "object") {
    return "";
  }

  const payload = inclusionPages as Record<string, unknown>;
  const captionSection = [
    readString(payload.caption),
    readString(payload.cause_number),
    readString(payload.court),
    joinNonEmpty([readString(payload.county), readString(payload.state)], ", "),
    readString(payload.deponent) ? `Deponent: ${readString(payload.deponent)}` : null,
    readString(payload.deposition_date) ? `Date: ${readString(payload.deposition_date)}` : null,
    joinNonEmpty([
      readString(payload.start_time) ? `Start: ${readString(payload.start_time)}` : null,
      readString(payload.end_time) ? `End: ${readString(payload.end_time)}` : null,
    ], "  "),
    readString(payload.remote_platform) ? `Platform: ${readString(payload.remote_platform)}` : readString(payload.address),
  ].filter((line): line is string => Boolean(line));

  const appearanceSection = formatAppearances(payload.appearances);
  const examinationIndex = formatIndexes(
    "INDEX OF EXAMINATION",
    readString(payload.deponent) ? [readString(payload.deponent) as string] : [],
  );
  const exhibitIndex = formatIndexes(
    "INDEX OF EXHIBITS",
    readStringArray(payload.exhibits).map((entry) => entry),
  );

  return [captionSection, appearanceSection, examinationIndex, exhibitIndex]
    .filter((section) => section.length > 0)
    .map((section) => section.join("\n"))
    .join("\n\n")
    .trim();
}
