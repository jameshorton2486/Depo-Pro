import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("desktop licensing contract", () => {
  it("authorizes both supported batch recovery purposes", () => {
    const source = readFileSync(
      fileURLToPath(new URL("../../supabase/functions/licensing/index.ts", import.meta.url)),
      "utf8",
    );

    expect(source).toContain('["speaker_accuracy", "transcript_recovery"].includes(body.purpose)');
  });
});
