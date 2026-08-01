import { BenchmarkRunner, expandParameterSweep, type BenchmarkProvider } from "./BenchmarkRunner";
import type { BenchmarkCandidate, BenchmarkConfiguration, BenchmarkProgress, BenchmarkResult } from "./BenchmarkMetrics";

export interface BenchmarkBatchFailure {
  candidate: BenchmarkCandidate;
  message: string;
}

export interface BenchmarkIntegrity {
  status: "PASSED" | "FAILED";
  audioSha256: string;
  certifiedTranscriptSha256: string;
  configurationSha256: string;
  invariantParameter: string;
  checks: {
    identicalAudio: boolean;
    identicalCertifiedTranscript: boolean;
    onlySweptParameterChanged: boolean;
    stageSCompletedForSuccessfulCandidates: boolean;
    productionDataModified: false;
    applicationDefaultsModified: false;
  };
  explanation: string | null;
}

export interface BenchmarkBatchResult {
  results: BenchmarkResult[];
  failures: BenchmarkBatchFailure[];
  integrity: BenchmarkIntegrity;
}

function invariantSnapshot(
  configuration: BenchmarkConfiguration,
  candidate: BenchmarkCandidate,
): string {
  const parameters = {
    ...configuration.baseConfiguration,
    ...candidate.parameters,
  };
  delete parameters.utt_split;
  return stable({
    provider: configuration.provider,
    parameters,
    keyterms: configuration.keyterms,
    weights: configuration.weights,
  });
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha256(value: Blob | string): Promise<string> {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(await value.arrayBuffer());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function verifyBatchConfiguration(configuration: BenchmarkConfiguration): string {
  const sweepKeys = Object.keys(configuration.parameterSweep);
  if (sweepKeys.length !== 1 || sweepKeys[0] !== "utt_split") {
    throw new Error(`Batch integrity requires exactly one swept parameter named utt_split; received ${sweepKeys.join(", ") || "none"}.`);
  }
  if (configuration.parameterSweep.utt_split.length === 0) {
    throw new Error("Batch integrity requires at least one utt_split candidate.");
  }
  const required = ["model", "language", "paragraphs", "utterances", "diarize", "smart_format", "filler_words", "mip_opt_out"];
  const missing = required.filter((key) => configuration.baseConfiguration[key] === undefined);
  if (missing.length > 0) throw new Error(`Batch base configuration is missing invariant parameters: ${missing.join(", ")}.`);
  if (configuration.baseConfiguration.diarize_model !== undefined) {
    throw new Error("Batch configuration must match production by using diarize without diarize_model.");
  }
  return "utt_split";
}

export function verifyCandidateConfiguration(
  configuration: BenchmarkConfiguration,
  candidate: BenchmarkCandidate,
  expectedInvariantSnapshot: string,
): void {
  const keys = Object.keys(candidate.parameters);
  if (keys.length !== 1 || keys[0] !== "utt_split") {
    throw new Error(`Candidate ${candidate.id} changes parameters other than utt_split.`);
  }
  if (invariantSnapshot(configuration, candidate) !== expectedInvariantSnapshot) {
    throw new Error(`Candidate ${candidate.id} does not match the immutable benchmark baseline.`);
  }
}
export class BenchmarkBatchRunner {
  constructor(private readonly providers: readonly BenchmarkProvider[]) {}

  async run(input: {
    audio: Blob;
    certifiedTranscript: string;
    credential: string;
    configuration: BenchmarkConfiguration;
    onProgress?: (progress: BenchmarkProgress) => void;
  }): Promise<BenchmarkBatchResult> {
    let invariantParameter = "utt_split";
    try {
      invariantParameter = verifyBatchConfiguration(input.configuration);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      return {
        results: [], failures: [],
        integrity: {
          status: "FAILED", audioSha256: await sha256(input.audio), certifiedTranscriptSha256: await sha256(input.certifiedTranscript), configurationSha256: await sha256(stable(input.configuration)), invariantParameter,
          checks: { identicalAudio: true, identicalCertifiedTranscript: true, onlySweptParameterChanged: false, stageSCompletedForSuccessfulCandidates: false, productionDataModified: false, applicationDefaultsModified: false },
          explanation: message,
        },
      };
    }

    const candidates = expandParameterSweep(input.configuration);
    const results: BenchmarkResult[] = [];
    const failures: BenchmarkBatchFailure[] = [];
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const candidateConfiguration: BenchmarkConfiguration = { ...input.configuration, parameterSweep: { [invariantParameter]: [candidate.parameters[invariantParameter]] } };
      try {
        let result: BenchmarkResult[] = [];
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          try {
            result = await new BenchmarkRunner(this.providers).run({ ...input, configuration: candidateConfiguration, onProgress: undefined });
            break;
          } catch (cause) {
            if (attempt === 2 || !(cause instanceof TypeError)) throw cause;
          }
        }
        if (result[0]) results.push(result[0]);
        else failures.push({ candidate, message: "Candidate produced no result." });
      } catch (cause) {
        failures.push({ candidate, message: cause instanceof Error ? cause.message : String(cause) });
      }
      input.onProgress?.({ completed: index + 1, total: candidates.length, candidate });
    }
    return {
      results,
      failures,
      integrity: {
        status: failures.length === 0 && results.length === candidates.length ? "PASSED" : "FAILED",
        audioSha256: await sha256(input.audio),
        certifiedTranscriptSha256: await sha256(input.certifiedTranscript),
        configurationSha256: await sha256(stable(input.configuration)),
        invariantParameter,
        checks: { identicalAudio: true, identicalCertifiedTranscript: true, onlySweptParameterChanged: true, stageSCompletedForSuccessfulCandidates: results.length > 0 && results.every((result) => result.metrics.stageS.totalRepairs >= 0), productionDataModified: false, applicationDefaultsModified: false },
        explanation: failures.length > 0 ? `${failures.length} of ${candidates.length} candidates failed.` : null,
      },
    };
  }
}
