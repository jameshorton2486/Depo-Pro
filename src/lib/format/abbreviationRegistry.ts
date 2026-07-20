import registryData from "../../../Canonical Standards Folder/abbreviation_registry.json" with { type: "json" };
import type { AbbreviationRegistry } from "./types.ts";

export const abbreviationRegistry = registryData as AbbreviationRegistry;
