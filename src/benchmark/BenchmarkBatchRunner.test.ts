import { describe, expect, it, vi } from "vitest";
import configuration from "../../benchmark.json";
import { BenchmarkBatchRunner, verifyBatchConfiguration } from "./BenchmarkBatchRunner";
import type { BenchmarkConfiguration } from "./BenchmarkMetrics";
import type { BenchmarkProvider } from "./BenchmarkRunner";

const transcript = {
  text: "SPEAKER 0: Synthetic testimony.", providerVersion: "synthetic-1",
  utterances: [{ id: "u1", speaker: "SPEAKER 0", text: "Synthetic testimony.", start: 0, end: 1, words: ["Synthetic", "testimony."] }],
};

describe("BenchmarkBatchRunner", () => {
  it("executes every configured candidate and cryptographically binds the inputs", async () => {
    const provider: BenchmarkProvider = { name: "deepgram", transcribe: vi.fn(async () => transcript) };
    const batch = await new BenchmarkBatchRunner([provider]).run({ audio: new Blob(["audio"]), certifiedTranscript: "A: Synthetic testimony.", credential: "synthetic", configuration: configuration as BenchmarkConfiguration });
    expect(batch.results).toHaveLength(5);
    expect(batch.failures).toHaveLength(0);
    expect(batch.integrity.status).toBe("PASSED");
    expect(batch.integrity.audioSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(new Set(batch.results.map((result) => JSON.stringify({ ...result.effectiveConfiguration.parameters, utt_split: undefined })))).toHaveLength(1);
  });

  it("records a failed candidate and continues", async () => {
    const provider: BenchmarkProvider = { name: "deepgram", transcribe: vi.fn(async (_audio, candidate) => {
      if (candidate.parameters.utt_split === 1) throw new Error("synthetic failure");
      return transcript;
    }) };
    const batch = await new BenchmarkBatchRunner([provider]).run({ audio: new Blob(["audio"]), certifiedTranscript: "A: Synthetic testimony.", credential: "synthetic", configuration: configuration as BenchmarkConfiguration });
    expect(batch.results).toHaveLength(4);
    expect(batch.failures).toEqual([{ candidate: { id: "utt_split=1", parameters: { utt_split: 1 } }, message: "synthetic failure" }]);
    expect(batch.integrity.status).toBe("FAILED");
  });

  it("rejects configuration changes outside utt_split", () => {
    expect(() => verifyBatchConfiguration({ ...(configuration as BenchmarkConfiguration), parameterSweep: { utt_split: [0.8], model: ["nova-2"] } })).toThrow(/exactly one swept parameter/);
  });
  it("requires the same diarization mode as production", () => {
    const mismatched = {
      ...(configuration as BenchmarkConfiguration),
      baseConfiguration: {
        ...(configuration as BenchmarkConfiguration).baseConfiguration,
        diarize: true,
        diarize_model: "latest",
      },
    };
    expect(() => verifyBatchConfiguration(mismatched)).toThrow(/match production/);
  });
});
