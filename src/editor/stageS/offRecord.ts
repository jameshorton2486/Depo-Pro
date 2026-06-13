import {
  OFF_RECORD,
  ON_RECORD,
  type RenderState,
} from "./models";
import type { StageSRole } from "../speakerMapping";

export type RecordTransition = "OFF" | "ON";

const TIME_PATTERN = /(\d{1,2}:\d{2})\s*(a\.?m\.?|p\.?m\.?|AM|PM)/i;

export function detectTransition(
  role: StageSRole | null | undefined,
  text: string,
): RecordTransition | null {
  if (role !== "videographer") {
    return null;
  }

  const normalized = text.toLowerCase();
  if (normalized.includes("off the record")) {
    return "OFF";
  }
  if (normalized.includes("back on the record") || normalized.includes("we are back")) {
    return "ON";
  }
  return null;
}

export function extractTime(text: string): string {
  const match = text.match(TIME_PATTERN);
  if (!match) {
    return "";
  }

  const meridiem = match[2].toLowerCase().startsWith("a") ? "a.m" : "p.m";
  return `${match[1]} ${meridiem}`;
}

export function applyTransition(transition: RecordTransition): RenderState {
  return transition === "OFF" ? OFF_RECORD : ON_RECORD;
}
