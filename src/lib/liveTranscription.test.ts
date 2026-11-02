import { describe, expect, it } from "vitest";
import { deepgramListenUrl, parseLiveTranscript, reconnectDelay } from "./liveTranscription";

describe("browser live transcription", () => {
  it("requests diarization, paragraphs, punctuation, and interim text", () => {
    const url = new URL(deepgramListenUrl("audio/webm;codecs=opus"));
    expect(url.searchParams.get("diarize")).toBe("true");
    expect(url.searchParams.get("paragraphs")).toBe("true");
    expect(url.searchParams.get("punctuate")).toBe("true");
    expect(url.searchParams.get("interim_results")).toBe("true");
    expect(url.searchParams.get("mimetype")).toBe("audio/webm;codecs=opus");
  });

  it("uses audio diarization metadata for speaker turns", () => {
    expect(parseLiveTranscript(JSON.stringify({
      is_final: true,
      channel: { alternatives: [{ transcript: "Please state your name.", words: [{ speaker: 2 }] }] },
    }))).toEqual({ speaker: 2, text: "Please state your name.", final: true });
    expect(parseLiveTranscript(JSON.stringify({ channel: { alternatives: [{ transcript: "" }] } }))).toBeNull();
  });

  it("backs off reconnects without exceeding fifteen seconds", () => {
    expect([0, 1, 2, 8].map(reconnectDelay)).toEqual([1000, 2000, 4000, 15000]);
  });
});
