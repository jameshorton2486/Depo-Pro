import type { Speaker } from "../api/types";
import { getBlockRole } from "./pagination";

export function abbreviateUtteranceLabel(label: string): string {
  const stripped = label.replace(/^THE\s+/, "").replace(/:$/, "").trim();
  if (stripped.length <= 10) return stripped;
  const parts = stripped.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0].slice(0, 3)}. ${parts[1].slice(0, 6)}`;
  }
  return stripped.slice(0, 10);
}

export function formatUtteranceTimeTitle(startTime: number): string {
  return `${Math.floor(startTime / 60)}:${String(Math.floor(startTime % 60)).padStart(2, "0")}`;
}

export function getUtterancePrefix(role: Speaker["role"] | null, speakerLabel: string): string {
  const blockRole = getBlockRole(role);
  if (blockRole === "Q") return "Q.";
  if (blockRole === "A") return "A.";
  return abbreviateUtteranceLabel(speakerLabel);
}
