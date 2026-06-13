import type { RecordTransition } from "./offRecord";

export function transitionParenthetical(
  transition: RecordTransition,
  time: string,
): string {
  if (transition === "OFF") {
    return time ? `(Recess taken at ${time}.)` : "(Recess taken.)";
  }

  return time ? `(Back on the record at ${time}.)` : "(Back on the record.)";
}

export function needsByLineAfter(transition: RecordTransition): boolean {
  return transition === "ON";
}
