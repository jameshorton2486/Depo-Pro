export type LiveTranscriptLine = { speaker: number; text: string; final: boolean };

export function deepgramListenUrl(mimeType: string): string {
  const params = new URLSearchParams({
    model: "nova-3",
    diarize: "true",
    smart_format: "true",
    punctuate: "true",
    paragraphs: "true",
    interim_results: "true",
    endpointing: "300",
    mimetype: mimeType,
  });
  return `wss://api.deepgram.com/v1/listen?${params}`;
}

export function parseLiveTranscript(raw: string): LiveTranscriptLine[] {
  const payload = JSON.parse(raw) as {
    is_final?: boolean;
    channel?: { alternatives?: Array<{ transcript?: string; words?: Array<{ speaker?: number; word?: string; punctuated_word?: string }> }> };
  };
  const alternative = payload.channel?.alternatives?.[0];
  if (!alternative?.transcript) return [];
  const words = alternative.words ?? [];
  if (!words.length) return [{ speaker: 0, text: alternative.transcript, final: Boolean(payload.is_final) }];
  const lines: LiveTranscriptLine[] = [];
  for (const word of words) {
    const speaker = Number(word.speaker ?? 0);
    const text = word.punctuated_word || word.word || "";
    if (!text) continue;
    const previous = lines[lines.length - 1];
    if (previous?.speaker === speaker) previous.text += ` ${text}`;
    else lines.push({ speaker, text, final: Boolean(payload.is_final) });
  }
  return lines.length ? lines : [{ speaker: Number(words[0]?.speaker ?? 0), text: alternative.transcript, final: Boolean(payload.is_final) }];
}

export function waitForRecorderStop(mediaRecorder: MediaRecorder): Promise<void> {
  if (mediaRecorder.state === "inactive") return Promise.resolve();
  return new Promise(resolve => {
    mediaRecorder.addEventListener("stop", () => resolve(), { once: true });
    mediaRecorder.stop();
  });
}

export async function finalizeTranscriptionSocket(socket: WebSocket | null, timeoutMs = 3000): Promise<void> {
  if (!socket || socket.readyState !== 1) return;
  await new Promise<void>(resolve => {
    const timer = globalThis.setTimeout(() => {
      socket.close();
      resolve();
    }, timeoutMs);
    socket.addEventListener("close", () => {
      globalThis.clearTimeout(timer);
      resolve();
    }, { once: true });
    socket.send(JSON.stringify({ type: "CloseStream" }));
  });
}

export function reconnectDelay(attempt: number): number {
  return Math.min(1000 * 2 ** Math.max(0, attempt), 15000);
}
