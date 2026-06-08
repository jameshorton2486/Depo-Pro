import { describe, expect, it } from "vitest";

import { buildTranscriptionArtifactPath, createTranscriptBusinessId, sha256Hex } from "./transcriptionJobs";

describe("transcription job helpers", () => {
  it("creates transcript ids with the expected business prefix", () => {
    expect(createTranscriptBusinessId(1234, 0)).toBe("tr_1234_000000");
  });

  it("hashes callback tokens deterministically", async () => {
    await expect(sha256Hex("callback-token")).resolves.toBe(
      "2bab857641ead2282344948fa6e48b34d6048089f1fd912e68c2f4fafb9c6a8f",
    );
  });

  it("builds owner-prefixed artifact paths", () => {
    expect(buildTranscriptionArtifactPath("user_1", "case_1", "request.json")).toBe(
      "user_1/case_1/transcription/request.json",
    );
  });
});
