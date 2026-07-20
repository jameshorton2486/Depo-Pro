import { abbreviationRegistry } from "./abbreviationRegistry.ts";

function getRegistryHonorifics(): Set<string> {
  const honorifics = new Set<string>();
  const allHonorifics = [
    ...(abbreviationRegistry.one_space_tokens.honorifics ?? []),
    ...(abbreviationRegistry.one_space_tokens.honorifics_caps ?? []),
  ];

  for (const honorific of allHonorifics) {
    honorifics.add(honorific.replace(/\.$/, "").toUpperCase());
  }

  return honorifics;
}

const REGISTRY_HONORIFICS = getRegistryHonorifics();

export function buildHonorificPrefixPattern(): RegExp {
  const tokens = [...REGISTRY_HONORIFICS]
    .filter((honorific) => honorific.length > 0)
    .map((honorific) => honorific.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  return new RegExp(`^(${tokens})\\.?\\s*`, "i");
}

export function stripHonorificPrefix(name: string): string {
  return name.replace(buildHonorificPrefixPattern(), "").trim();
}

export function isRegistryHonorific(token: string): boolean {
  const normalized = token.replace(/\.$/, "").toUpperCase();
  return REGISTRY_HONORIFICS.has(normalized);
}
