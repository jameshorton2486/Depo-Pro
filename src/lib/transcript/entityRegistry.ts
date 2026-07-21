import type { CaseRecord } from "../../types/case";

export interface EntityRegistryEntry {
  canonical: string;
  normalized: string;
  aliases: string[];
  category:
    | "witness"
    | "attorney"
    | "law_firm"
    | "party"
    | "reporter"
    | "videographer"
    | "employer"
    | "court"
    | "case";
}

export interface EntityRegistry {
  entries: EntityRegistryEntry[];
  canonicalMap: Map<string, EntityRegistryEntry>;
  aliasMap: Map<string, EntityRegistryEntry>;
}

function normalizeEntityValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s.&'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function extractSurname(value: string): string | null {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] ?? null : null;
}

function pushAlias(aliases: string[], value: string | null | undefined): void {
  if (!value) {
    return;
  }
  const normalized = normalizeEntityValue(value);
  if (!normalized || aliases.includes(normalized)) {
    return;
  }
  aliases.push(normalized);
}

function addEntry(
  entries: EntityRegistryEntry[],
  category: EntityRegistryEntry["category"],
  canonical: string | null | undefined,
  aliases: Array<string | null | undefined> = [],
): void {
  if (!canonical) {
    return;
  }

  const normalized = normalizeEntityValue(canonical);
  if (!normalized) {
    return;
  }

  const entryAliases: string[] = [];
  pushAlias(entryAliases, canonical);
  for (const alias of aliases) {
    pushAlias(entryAliases, alias);
  }

  entries.push({
    canonical,
    normalized,
    aliases: entryAliases,
    category,
  });
}

export function buildEntityRegistry(record: CaseRecord | null | undefined): EntityRegistry {
  const entries: EntityRegistryEntry[] = [];

  if (record) {
    addEntry(entries, "case", record.caption.case_style.value, [
      record.caption.case_name.value,
      record.caption.case_number.value,
    ]);
    addEntry(entries, "court", record.caption.court_name.value, [
      record.caption.county.value,
      record.caption.judicial_district.value ?? undefined,
    ]);
    addEntry(entries, "reporter", record.reporter.name.value, [
      record.reporter.firm.value ?? undefined,
      record.reporter.cert_number.value,
    ]);

    for (const witness of record.witnesses ?? []) {
      const surname = extractSurname(witness.name.value);
      addEntry(entries, "witness", witness.name.value, [
        witness.title.value ?? undefined,
        witness.employer.value ?? undefined,
        witness.prefix_suffix ?? undefined,
        surname ? `Dr. ${surname}` : undefined,
        "The Witness", surname ? `The Witness ${surname}` : undefined,
      ]);
      addEntry(entries, "employer", witness.employer.value ?? null, []);
    }

    for (const attorney of record.attorneys ?? []) {
      const surname = extractSurname(attorney.name.value);
      addEntry(entries, "attorney", attorney.name.value, [
        surname ? `Mr. ${surname}` : undefined,
        surname ? `Ms. ${surname}` : undefined,
        attorney.firm.value ?? undefined,
        attorney.representing.value ?? undefined,
      ]);
      addEntry(entries, "law_firm", attorney.firm.value ?? null, []);
    }

    for (const lawFirm of record.law_firms ?? []) {
      addEntry(entries, "law_firm", lawFirm.name.value, []);
    }

    for (const party of record.parties ?? []) {
      addEntry(entries, "party", party.name.value, [
        party.role.value,
        party.entity_type.value ?? undefined,
      ]);
    }

    for (const videographer of record.videographers ?? []) {
      addEntry(entries, "videographer", videographer.name.value, [
        videographer.firm.value ?? undefined,
      ]);
    }
  }

  const dedupedEntries = new Map<string, EntityRegistryEntry>();
  for (const entry of entries) {
    const key = `${entry.category}:${entry.normalized}`;
    const existing = dedupedEntries.get(key);
    if (!existing) {
      dedupedEntries.set(key, {
        ...entry,
        aliases: [...entry.aliases],
      });
      continue;
    }

    for (const alias of entry.aliases) {
      if (!existing.aliases.includes(alias)) {
        existing.aliases.push(alias);
      }
    }
  }

  const finalEntries = [...dedupedEntries.values()];
  const canonicalMap = new Map<string, EntityRegistryEntry>();
  const aliasMap = new Map<string, EntityRegistryEntry>();

  for (const entry of finalEntries) {
    canonicalMap.set(entry.normalized, entry);
    for (const alias of entry.aliases) {
      aliasMap.set(alias, entry);
    }
  }

  return {
    entries: finalEntries,
    canonicalMap,
    aliasMap,
  };
}

export function findEntityMatch(
  registry: EntityRegistry | null | undefined,
  value: string | null | undefined,
): EntityRegistryEntry | null {
  if (!registry || !value) {
    return null;
  }
  const normalized = normalizeEntityValue(value);
  if (!normalized) {
    return null;
  }
  return registry.canonicalMap.get(normalized) ?? registry.aliasMap.get(normalized) ?? null;
}

export function listRegistryTerms(
  registry: EntityRegistry | null | undefined,
  categories?: EntityRegistryEntry["category"][],
): string[] {
  const allowed = categories ? new Set(categories) : null;
  const terms = new Set<string>();
  if (!registry) {
    return [];
  }

  for (const entry of registry.entries) {
    if (allowed && !allowed.has(entry.category)) {
      continue;
    }
    terms.add(entry.canonical);
    for (const alias of entry.aliases) {
      if (alias.length > 2 && alias !== entry.normalized) {
        terms.add(toTitleCase(alias));
      }
    }
  }

  return [...terms];
}

