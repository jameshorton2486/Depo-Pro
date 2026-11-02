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

export function parseLiveTranscript(raw: string): LiveTranscriptLine | null {
  const payload = JSON.parse(raw) as {
    is_final?: boolean;
    channel?: { alternatives?: Array<{ transcript?: string; words?: Array<{ speaker?: number }> }> };
  };
  const alternative = payload.channel?.alternatives?.[0];
  if (!alternative?.transcript) return null;
  return {
    speaker: Number(alternative.words?.[0]?.speaker ?? 0),
    text: alternative.transcript,
    final: Boolean(payload.is_final),
  };
}

export function reconnectDelay(attempt: number): number {
  return Math.min(1000 * 2 ** Math.max(0, attempt), 15000);
}
