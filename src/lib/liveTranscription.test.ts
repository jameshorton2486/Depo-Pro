import { describe, expect, it } from "vitest";
import { deepgramListenUrl, finalizeTranscriptionSocket, parseLiveTranscript, reconnectDelay, waitForRecorderStop } from "./liveTranscription";

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
      channel: { alternatives: [{ transcript: "Please state your name.", words: [{ speaker: 2, punctuated_word: "Please" }, { speaker: 2, punctuated_word: "state" }] }] },
    }))).toEqual([{ speaker: 2, text: "Please state", final: true }]);
    expect(parseLiveTranscript(JSON.stringify({ channel: { alternatives: [{ transcript: "" }] } }))).toEqual([]);
  });

  it("splits one provider result when the audio diarization speaker changes", () => {
    expect(parseLiveTranscript(JSON.stringify({ is_final: true, channel: { alternatives: [{ transcript: "Question. Answer.", words: [
      { speaker: 0, punctuated_word: "Question." }, { speaker: 1, punctuated_word: "Answer." },
    ] }] } }))).toEqual([
      { speaker: 0, text: "Question.", final: true },
      { speaker: 1, text: "Answer.", final: true },
    ]);
  });

  it("waits for the recorder stop event that follows its final data event", async () => {
    let stopped = false;
    const listeners = new Map<string, () => void>();
    const fake = { state: "recording", addEventListener: (name: string, fn: () => void) => listeners.set(name, fn), stop: () => { stopped = true; listeners.get("stop")?.(); } } as unknown as MediaRecorder;
    await waitForRecorderStop(fake);
    expect(stopped).toBe(true);
  });

  it("asks Deepgram to finalize and waits for the socket close", async () => {
    const sent: string[] = [];
    const listeners = new Map<string, () => void>();
    const fake = { readyState: WebSocket.OPEN, send: (value: string) => sent.push(value), close: () => listeners.get("close")?.(), addEventListener: (name: string, fn: () => void) => listeners.set(name, fn) } as unknown as WebSocket;
    const pending = finalizeTranscriptionSocket(fake, 50);
    expect(sent).toEqual([JSON.stringify({ type: "CloseStream" })]);
    listeners.get("close")?.();
    await pending;
  });

  it("backs off reconnects without exceeding fifteen seconds", () => {
    expect([0, 1, 2, 8].map(reconnectDelay)).toEqual([1000, 2000, 4000, 15000]);
  });
});
