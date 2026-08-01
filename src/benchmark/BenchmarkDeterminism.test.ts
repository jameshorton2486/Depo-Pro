import { describe, expect, it, vi } from "vitest";
import configuration from "../../benchmark.json";
import { BenchmarkRunner, type BenchmarkProvider } from "./BenchmarkRunner";
import { benchmarkReportJson, buildBenchmarkReport } from "./BenchmarkReport";
import type { BenchmarkConfiguration, BenchmarkTranscript } from "./BenchmarkMetrics";

const transcript: BenchmarkTranscript = {
  text: "SPEAKER 0: Where do you work?\nSPEAKER 1: I work at Example Medical.",
  providerVersion: "synthetic-1",
  utterances: [
    { id: "u1", speaker: "SPEAKER 0", text: "Where do you work?", start: 0, end: 1, words: ["Where", "do", "you", "work?"] },
    { id: "u2", speaker: "SPEAKER 1", text: "I work at Example Medical.", start: 1, end: 2, words: ["I", "work", "at", "Example", "Medical."] },
  ],
};

function withoutTimestamp(value: string): string {
  return value.replace(/"generatedAt": "[^"]+"/, "\"generatedAt\": \"<timestamp>\"");
}

describe("benchmark determinism and Stage S isolation", () => {
  it("produces byte-identical reports except for the injected timestamp", async () => {
    const transcribe = vi.fn(async () => transcript);
    const provider: BenchmarkProvider = { name: "deepgram", transcribe };
    const runner = new BenchmarkRunner([provider]);
    const input = {
      audio: new Blob(["synthetic"]),
      certifiedTranscript: "Q: Where do you work?\nA: I work at Example Medical.",
      credential: "not-a-real-key",
      configuration: configuration as BenchmarkConfiguration,
    };
    const first = await runner.run(input);
    const second = await runner.run(input);
    const reportInput = {
      provider: "deepgram",
      audioName: "synthetic.wav",
      certifiedTranscriptName: "synthetic.txt",
      model: "nova-3",
      configuration: input.configuration,
    };
    const firstJson = benchmarkReportJson(buildBenchmarkReport({ ...reportInput, generatedAt: "2026-01-01T00:00:00.000Z", results: first }));
    const secondJson = benchmarkReportJson(buildBenchmarkReport({ ...reportInput, generatedAt: "2026-01-02T00:00:00.000Z", results: second }));

    expect(withoutTimestamp(firstJson)).toBe(withoutTimestamp(secondJson));
    expect(transcribe).toHaveBeenCalledTimes(10);
  });

  it("does not expose a persistence dependency from the runner", () => {
    expect(Object.getOwnPropertyNames(BenchmarkRunner.prototype)).toEqual(["constructor", "run"]);
  });
});
