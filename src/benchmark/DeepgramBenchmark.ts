import { externalJsonRequest } from "../api/client";
import type { DeepgramResponse } from "../lib/transcript/types";
import type {
  BenchmarkCandidate,
  BenchmarkConfiguration,
  BenchmarkParameterValue,
  BenchmarkTranscript,
} from "./BenchmarkMetrics";

export interface BenchmarkProvider {
  readonly name: string;
  transcribe(
    audio: Blob,
    candidate: BenchmarkCandidate,
    configuration: BenchmarkConfiguration,
    credential: string,
  ): Promise<BenchmarkTranscript>;
}

function stringifyParameter(value: BenchmarkParameterValue): string {
  return typeof value === "boolean" ? String(value) : `${value}`;
}

export function buildDeepgramBenchmarkUrl(
  candidate: BenchmarkCandidate,
  configuration: BenchmarkConfiguration,
): string {
  const params = new URLSearchParams();
  const combined = { ...configuration.baseConfiguration, ...candidate.parameters };
  Object.keys(combined).sort().forEach((key) => params.set(key, stringifyParameter(combined[key])));
  configuration.keyterms.forEach((keyterm) => params.append("keyterm", keyterm));
  return `https://api.deepgram.com/v1/listen?${params.toString()}`;
}

export function deepgramResponseToBenchmarkTranscript(response: DeepgramResponse): BenchmarkTranscript {
  const source = response.results.utterances ?? [];
  const utterances = source.map((utterance, index) => {
    const words = utterance.words.map((word) => word.punctuated_word ?? word.word);
    return {
      id: utterance.id ?? `utterance-${index}`,
      speaker: `SPEAKER ${utterance.speaker ?? 0}`,
      text: utterance.transcript?.trim() || words.join(" ").trim(),
      start: utterance.start,
      end: utterance.end,
      words,
    };
  });

  const fallbackWords = response.results.channels[0]?.alternatives[0]?.words ?? [];
  const resolved = utterances.length > 0 ? utterances : [{
    id: "utterance-0",
    speaker: "SPEAKER 0",
    text: response.results.channels[0]?.alternatives[0]?.transcript ?? "",
    start: fallbackWords[0]?.start ?? 0,
    end: fallbackWords[fallbackWords.length - 1]?.end ?? 0,
    words: fallbackWords.map((word) => word.punctuated_word ?? word.word),
  }];

  return {
    text: resolved.map((utterance) => `${utterance.speaker}: ${utterance.text}`).join("\n"),
    providerVersion: Object.values(response.metadata.model_info ?? {}).map((model) => model.version).sort().join(",") || "unknown",
    utterances: resolved,
  };
}

export class DeepgramBenchmark implements BenchmarkProvider {
  readonly name = "deepgram";

  async transcribe(
    audio: Blob,
    candidate: BenchmarkCandidate,
    configuration: BenchmarkConfiguration,
    credential: string,
  ): Promise<BenchmarkTranscript> {
    if (!credential.trim()) {
      throw new Error("A Deepgram API key is required for the benchmark.");
    }
    const response = await externalJsonRequest<DeepgramResponse>(
      "POST",
      buildDeepgramBenchmarkUrl(candidate, configuration),
      {
        headers: {
          Authorization: `Token ${credential.trim()}`,
          "Content-Type": audio.type || "application/octet-stream",
        },
        body: audio,
      },
    );
    return deepgramResponseToBenchmarkTranscript(response);
  }
}
